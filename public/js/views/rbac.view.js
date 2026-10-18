/**
 * VISTA DE ROLES Y PERMISOS (RBAC) — NÚCLEO FINANCIERO
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

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

    this.container.innerHTML = `
      <div class="rbac-container">
        <!-- Tarjeta de Usuario Actual y Estado de Permisos -->
        <div class="rbac-user-card">
          <div class="rbac-user-info">
            <div class="rbac-avatar-large">${user.nombre.substring(0, 2).toUpperCase()}</div>
            <div class="rbac-user-details">
              <h3>${user.nombre}</h3>
              <p>${user.email} · Establecimiento: <b>${state.currentTenant.name}</b></p>
              <div class="rbac-badges-wrap">
                <span class="badge-role-pill">Rol: ${user.rol.nombre}</span>
                ${
                  isSuperAdmin
                    ? '<span class="badge-superadmin-pill">⭐ Super Administrador (Bypass Total RBAC)</span>'
                    : ''
                }
              </div>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Aislamiento Activo</div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${state.currentTenant.nit}</div>
            <div style="font-size: 12px; color: #2563eb;">${state.currentTenant.category}</div>
          </div>
        </div>

        <!-- Directorio de Usuarios de este Establecimiento -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 700; color: #0f172a;">
              👥 Colaboradores y Usuarios de ${state.currentTenant.name}
            </h3>
            <span style="font-size: 12px; color: #64748b;" id="users-count-badge">Consultando directorio...</span>
          </div>

          <div id="users-directory-table" style="overflow-x: auto;">
            <p style="padding: 20px; text-align: center; color: #64748b;">Cargando usuarios del schema aislado...</p>
          </div>
        </div>

        <!-- Matriz de Permisos por Módulo -->
        <div>
          <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 14px;">
            Matriz de Permisos del Sistema (16 Permisos Granulares)
          </h3>
          <div class="rbac-modules-grid" id="rbac-modules-grid">
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">
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
      console.error('Error al cargar datos RBAC:', err);
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
      container.innerHTML = '<p style="padding: 20px; text-align: center; color: #64748b;">No hay usuarios registrados.</p>';
      return;
    }

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 8px 12px;">Nombre</th>
            <th style="padding: 8px 12px;">Correo Electrónico</th>
            <th style="padding: 8px 12px;">Rol Asignado</th>
            <th style="padding: 8px 12px;">Acceso con PIN</th>
            <th style="padding: 8px 12px;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${this.usuarios
            .map(
              (u) => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #0f172a;">${u.nombre}</td>
              <td style="padding: 10px 12px; color: #64748b;">${u.email}</td>
              <td style="padding: 10px 12px;">
                <span class="badge-role-pill" style="font-size: 11px;">${u.rol.nombre}</span>
              </td>
              <td style="padding: 10px 12px; font-family: monospace;">
                ${u.tienePin ? '<span style="color: #15803d; font-weight: bold;">✓ PIN Habilitado</span>' : '<span style="color: #94a3b8;">No configurado</span>'}
              </td>
              <td style="padding: 10px 12px;">
                <span style="background: #ecfdf5; color: #059669; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Activo</span>
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

    const user = state.currentUser;
    const isSuperAdmin = user?.esSuperAdmin || user?.rol?.slug === 'super_admin';
    const userPermCodes = Array.isArray(user?.permisos) ? user.permisos.map((p) => (typeof p === 'string' ? p : p.codigo)) : [];

    const moduleKeys = Object.keys(modulos);
    if (moduleKeys.length === 0) {
      grid.innerHTML = '<p style="padding: 20px; text-align: center; color: #64748b;">No hay permisos cargados.</p>';
      return;
    }

    grid.innerHTML = moduleKeys
      .map((modName) => {
        const perms = modulos[modName] || [];

        return `
          <div class="rbac-module-box">
            <div class="rbac-module-header">
              <span class="rbac-module-title">${modName}</span>
              <span style="font-size: 11px; color: #64748b; font-weight: 600;">${perms.length} permisos</span>
            </div>

            <div class="rbac-perms-list">
              ${perms
                .map((p) => {
                  const hasPerm = isSuperAdmin || userPermCodes.includes(p.codigo);
                  return `
                    <div class="rbac-perm-item ${hasPerm ? 'granted' : 'denied'}">
                      <div>
                        <b>${p.nombre}</b>
                        <div style="font-size: 11px; color: #64748b;">${p.codigo}</div>
                      </div>
                      <span class="perm-status-indicator ${hasPerm ? 'granted' : 'denied'}">
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
}
