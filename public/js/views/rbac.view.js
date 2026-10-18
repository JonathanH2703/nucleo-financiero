/**
 * VISTA DE ROLES Y PERMISOS (RBAC) — NÚCLEO FINANCIERO
 * Administra el control de acceso granular por perfiles, directorio de colaboradores y matriz de permisos.
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';
import { ROLE_DEFINITIONS } from '../demo-fixtures.js';

export class RbacView {
  static async mount(container) {
    this.container = container;
    this.roles = [];
    this.permisos = [];
    this.usuarios = [];

    this.renderSkeleton();
    await this.loadData();
  }

  static renderSkeleton() {
    const user = state.currentUser || {
      nombre: 'Usuario Demostrativo',
      email: 'demo@nucleo.co',
      rol: { nombre: 'Super Administrador', slug: 'super_admin' },
      permisos: [],
      esSuperAdmin: true,
    };

    const isSuperAdmin = user.esSuperAdmin || user.rol.slug === 'super_admin';
    const roleDef = ROLE_DEFINITIONS[user.rol.slug] || ROLE_DEFINITIONS.mesero;

    this.container.innerHTML = `
      <div class="rbac-container" style="max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; padding-bottom: 32px;">
        <!-- Tarjeta de Usuario Actual y Estado de Permisos -->
        <div class="rbac-user-card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px 28px; box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div class="rbac-user-info" style="display: flex; align-items: center; gap: 16px;">
            <div class="rbac-avatar-large" style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; flex-shrink: 0;">
              ${user.nombre.substring(0, 2).toUpperCase()}
            </div>
            <div class="rbac-user-details">
              <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin-bottom: 2px;">${user.nombre}</h3>
              <p style="font-size: 13px; color: var(--text-muted);">${user.email} · Establecimiento: <b>${state.currentTenant.name}</b></p>
              <div class="rbac-badges-wrap" style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                <span class="badge" style="background: var(--primary-50); color: var(--primary-600); border: 1px solid var(--primary-100); font-weight: 700; font-size: 11px;">
                  Rol: ${user.rol.nombre}
                </span>
                ${
                  isSuperAdmin
                    ? '<span class="badge" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: 700; font-size: 11px;">⭐ Super Administrador (Bypass Total RBAC)</span>'
                    : ''
                }
              </div>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Aislamiento Multi-Tenant</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">${state.currentTenant.nit}</div>
            <div style="font-size: 12px; color: var(--primary-600);">${state.currentTenant.category}</div>
          </div>
        </div>

        <!-- Perfiles y Alcance Operativo del Sistema -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px 28px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 20px;">🛡️</span>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main);">Matriz Oficial de Roles y Alcance de Acceso</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">
            Cada rol tiene restringida la navegación y las transacciones únicamente a sus funciones operativas asignadas.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 14px;">
            ${Object.values(ROLE_DEFINITIONS)
              .map(
                (r) => `
              <div style="border: 1px solid ${user.rol.slug === r.slug ? 'var(--primary-600)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 14px; background: ${user.rol.slug === r.slug ? 'var(--primary-50)' : 'var(--bg-subtle)'};">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-weight: 800; font-size: 13px; color: var(--text-main);">${r.nombre}</span>
                  ${user.rol.slug === r.slug ? '<span style="background: var(--primary-600); color: white; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: 700;">Tu Rol</span>' : ''}
                </div>
                <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px; line-height: 1.3;">${r.desc}</p>
                <div style="font-size: 11px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Módulos Permitidos:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                  ${r.allowedViews
                    .map(
                      (v) => `
                    <span style="background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; color: var(--text-main);">
                      ${v.toUpperCase()}
                    </span>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Directorio de Usuarios de este Establecimiento -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px 28px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main);">
                👥 Colaboradores y Usuarios de ${state.currentTenant.name}
              </h3>
              <p style="font-size: 12px; color: var(--text-muted);">Usuarios con acceso autorizado a este establecimiento</p>
            </div>
            <span style="font-size: 12px; color: var(--text-muted);" id="users-count-badge">Consultando colaboradores...</span>
          </div>

          <div id="users-directory-table" style="overflow-x: auto;">
            <p style="padding: 20px; text-align: center; color: var(--text-muted);">Cargando usuarios del schema aislado...</p>
          </div>
        </div>

        <!-- Matriz de Permisos Granulares -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px 28px; box-shadow: var(--shadow-sm);">
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
              Matriz de Permisos del Sistema (16 Permisos Granulares)
            </h3>
            <p style="font-size: 12px; color: var(--text-muted);">
              Verificación en tiempo real de los permisos habilitados para el usuario actual:
            </p>
          </div>
          <div class="rbac-modules-grid" id="rbac-modules-grid">
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
              ⏳ Cargando catálogo de roles y permisos...
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static async loadData() {
    try {
      const [rolesRes, permisosRes, usuariosRes] = await Promise.all([
        ApiClient.listRoles(),
        ApiClient.listPermisos(),
        ApiClient.listUsuarios(),
      ]);

      if (rolesRes.success) this.roles = rolesRes.data;
      if (permisosRes.success) this.permisos = permisosRes.permisos || [];
      if (usuariosRes.success) this.usuarios = usuariosRes.data || [];

      this.renderUsersDirectory();
      this.renderModulesGrid(permisosRes.modulos || {});
    } catch (err) {
      console.warn('Cargando usuarios desde fixtures locales:', err);
      // Fallback a usuarios del tenant activo en fixtures
      this.usuarios = (state.currentTenant.users || []).map((u, i) => ({
        id: `usr_${i}`,
        nombre: u.nombre,
        email: u.email,
        rol: { nombre: u.rol, slug: u.rolSlug },
        tienePin: Boolean(u.pin),
      }));
      this.renderUsersDirectory();
      this.renderModulesGridFromStatic();
    }
  }

  static renderUsersDirectory() {
    const container = document.getElementById('users-directory-table');
    const badge = document.getElementById('users-count-badge');
    if (!container) return;

    if (badge) {
      badge.textContent = `${this.usuarios.length} usuario${this.usuarios.length > 1 ? 's' : ''} en este negocio`;
    }

    if (this.usuarios.length === 0) {
      container.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-muted);">No hay usuarios registrados.</p>';
      return;
    }

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
            <th style="padding: 10px 14px;">Nombre</th>
            <th style="padding: 10px 14px;">Correo Electrónico</th>
            <th style="padding: 10px 14px;">Rol Asignado</th>
            <th style="padding: 10px 14px;">Acceso con PIN</th>
            <th style="padding: 10px 14px;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${this.usuarios
            .map(
              (u) => `
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 10px 14px; font-weight: 700; color: var(--text-main);">${u.nombre}</td>
              <td style="padding: 10px 14px; color: var(--text-muted);">${u.email}</td>
              <td style="padding: 10px 14px;">
                <span class="badge" style="background: var(--primary-50); color: var(--primary-600); border: 1px solid var(--primary-100); font-size: 11px; font-weight: 600;">
                  ${u.rol?.nombre || u.rol || 'Colaborador'}
                </span>
              </td>
              <td style="padding: 10px 14px; font-family: monospace;">
                ${u.tienePin || u.pin ? '<span style="color: #059669; font-weight: bold;">✓ PIN Habilitado</span>' : '<span style="color: var(--text-light);">No configurado</span>'}
              </td>
              <td style="padding: 10px 14px;">
                <span class="badge badge-pagada" style="font-size: 10px;">Activo</span>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  static renderModulesGrid(modulos) {
    const grid = document.getElementById('rbac-modules-grid');
    if (!grid) return;

    const moduleKeys = Object.keys(modulos);
    if (moduleKeys.length === 0) {
      this.renderModulesGridFromStatic();
      return;
    }

    const user = state.currentUser;
    const isSuperAdmin = user?.esSuperAdmin || user?.rol?.slug === 'super_admin';
    const userPermCodes = Array.isArray(user?.permisos) ? user.permisos.map((p) => (typeof p === 'string' ? p : p.codigo)) : [];

    grid.innerHTML = moduleKeys
      .map((modName) => {
        const perms = modulos[modName] || [];

        return `
          <div class="rbac-module-box" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 16px;">
            <div class="rbac-module-header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; margin-bottom: 10px;">
              <span class="rbac-module-title" style="font-size: 12px; font-weight: 800; color: var(--text-main); text-transform: uppercase;">${modName}</span>
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${perms.length} permisos</span>
            </div>

            <div class="rbac-perms-list" style="display: flex; flex-direction: column; gap: 6px;">
              ${perms
                .map((p) => {
                  const hasPerm = isSuperAdmin || userPermCodes.includes(p.codigo);
                  return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: var(--radius-sm); background: ${hasPerm ? 'var(--badge-green-bg)' : 'var(--bg-subtle)'}; border: 1px solid ${hasPerm ? 'var(--badge-green-border)' : 'var(--border-subtle)'}; font-size: 12px;">
                      <div>
                        <b style="color: ${hasPerm ? 'var(--badge-green-text)' : 'var(--text-muted)'};">${p.nombre}</b>
                        <div style="font-size: 10px; color: var(--text-light); font-family: monospace;">${p.codigo}</div>
                      </div>
                      <span class="badge ${hasPerm ? 'badge-pagada' : 'badge-anulada'}" style="font-size: 10px;">
                        ${hasPerm ? 'Habilitado' : 'Denegado'}
                      </span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      })
      .join('');
  }

  static renderModulesGridFromStatic() {
    const grid = document.getElementById('rbac-modules-grid');
    if (!grid) return;

    const user = state.currentUser;
    const isSuperAdmin = user?.esSuperAdmin || user?.rol?.slug === 'super_admin';
    const roleDef = ROLE_DEFINITIONS[user?.rol?.slug] || ROLE_DEFINITIONS.mesero;
    const userPermCodes = user?.permisos || roleDef.permisos || [];

    const staticModules = {
      'Punto de Venta (POS)': [
        { codigo: 'pos.comanda.crear', nombre: 'Crear y agregar ítems a comanda' },
        { codigo: 'pos.comanda.cobrar', nombre: 'Registrar pago y liquidar ventas' },
        { codigo: 'pos.comanda.anular', nombre: 'Anular comandas activas' },
        { codigo: 'pos.descuento.aplicar', nombre: 'Aplicar descuentos manuales en caja' },
        { codigo: 'pos.mesas.gestionar', nombre: 'Dividir, unir y mover mesas' },
      ],
      'Cocina y KDS': [
        { codigo: 'kds.monitor.ver', nombre: 'Visualizar órdenes en monitor de cocina' },
        { codigo: 'kds.estado.actualizar', nombre: 'Marcar platos en preparación / despachados' },
      ],
      'Catálogo e Inventario': [
        { codigo: 'catalogo.ver', nombre: 'Consultar productos, precios y stock' },
        { codigo: 'catalogo.editar', nombre: 'Crear y modificar productos e impuestos' },
        { codigo: 'inventario.ajustar', nombre: 'Registrar entradas, mermas y kardex' },
      ],
      'Facturación Electrónica DIAN': [
        { codigo: 'facturacion.emitir', nombre: 'Emitir factura electrónica con CUFE' },
        { codigo: 'facturacion.reportes.ver', nombre: 'Consultar malla de facturas y ventas' },
      ],
      'Contabilidad y DIAN': [
        { codigo: 'contabilidad.declaraciones.ver', nombre: 'Consultar F-350, F-300 y F-110' },
        { codigo: 'contabilidad.asientos.crear', nombre: 'Registrar asientos contables' },
      ],
      'Usuarios y Roles': [
        { codigo: 'usuarios.gestionar', nombre: 'Crear cajeros, meseros y asignar PIN' },
        { codigo: 'roles.personalizar', nombre: 'Modificar y crear roles personalizados' },
      ],
    };

    grid.innerHTML = Object.entries(staticModules)
      .map(([modName, perms]) => `
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; margin-bottom: 10px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--text-main); text-transform: uppercase;">${modName}</span>
            <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${perms.length} permisos</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${perms
              .map((p) => {
                const hasPerm = isSuperAdmin || userPermCodes.includes(p.codigo);
                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: var(--radius-sm); background: ${hasPerm ? 'var(--badge-green-bg)' : 'var(--bg-subtle)'}; border: 1px solid ${hasPerm ? 'var(--badge-green-border)' : 'var(--border-subtle)'}; font-size: 12px;">
                    <div>
                      <b style="color: ${hasPerm ? 'var(--badge-green-text)' : 'var(--text-muted)'};">${p.nombre}</b>
                      <div style="font-size: 10px; color: var(--text-light); font-family: monospace;">${p.codigo}</div>
                    </div>
                    <span class="badge ${hasPerm ? 'badge-pagada' : 'badge-anulada'}" style="font-size: 10px;">
                      ${hasPerm ? 'Habilitado' : 'Denegado'}
                    </span>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `)
      .join('');
  }
}
