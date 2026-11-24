/**
 * VISTA DE GESTIÓN DE EMPRESAS Y SUCURSALES — NÚCLEO FINANCIERO
 * Permite al Administrador del Sistema gestionar a los Clientes SaaS (Empresas),
 * configurar sus Planes (Básico vs Intermedio/Crecimiento), activar o desactivar módulos (Feature Flags),
 * y auditar sus sucursales activas y usuarios registrados.
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';
import { Icons } from '../icons.js';

export class TenantsAdminView {
  static async mount(container) {
    this.container = container;
    this.tenants = [];
    this.sucursales = [];
    this.activeTenantDetail = null;
    this.selectedTenant = state.currentTenant;
    this.activeTab = state.currentUser?.esSuperAdmin ? 'empresas' : 'sucursales';
    this.isLoading = true;

    this.render();
    await this.loadData();
  }

  static render() {
    const isSuperAdmin = Boolean(state.currentUser?.esSuperAdmin);

    this.container.innerHTML = `
      <div class="tenants-admin-container" style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; padding-bottom: 50px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 18px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <span style="display: inline-flex; color: #2563eb;">${Icons.building(26)}</span>
              <h1 style="font-size: 22px; font-weight: 800; color: var(--text-main); margin: 0;">
                ${isSuperAdmin ? 'Administración de Clientes SaaS & Planes' : `Sucursales y Sedes de ${state.currentTenant.name}`}
              </h1>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
              ${isSuperAdmin
        ? 'Gobierno centralizado de empresas inquilinas. Asigna planes (Básico vs Crecimiento), gestiona módulos activos, audita sucursales y usuarios.'
        : 'Configura las sucursales físicas de tu negocio. Cada sucursal accede con su propio PIN independiente para operar el POS.'}
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" id="btn-refresh-admin" style="background: var(--bg-card); border: 1px solid var(--border-subtle); color: var(--text-main); padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              ${Icons.refresh(14)} Actualizar
            </button>
            ${isSuperAdmin ? `
              <button type="button" id="btn-nueva-empresa" style="background: #2563eb; color: #ffffff; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                + Nueva Empresa
              </button>
            ` : ''}
            <button type="button" id="btn-nueva-sucursal" style="background: #059669; color: #ffffff; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
              + Nueva Sucursal
            </button>
          </div>
        </div>

        <!-- Pestañas de Navegación si es Super Admin -->
        ${isSuperAdmin ? `
          <div style="display: flex; gap: 10px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 2px;">
            <button type="button" class="admin-tab-btn ${this.activeTab === 'empresas' ? 'active' : ''}" data-tab="empresas" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'empresas' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'empresas' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer;">
              Empresas Clientes (${this.tenants.length})
            </button>
            <button type="button" class="admin-tab-btn ${this.activeTab === 'sucursales' ? 'active' : ''}" data-tab="sucursales" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'sucursales' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'sucursales' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer;">
              Sedes Físicas (${this.sucursales.length})
            </button>
          </div>
        ` : ''}

        <!-- Contenedor Principal de Contenido -->
        <div id="admin-content-area">
          ${this.isLoading ? `
            <div style="padding: 60px; text-align: center; color: var(--text-muted);">
              ⏳ Cargando catálogo de infraestructura y planes...
            </div>
          ` : (this.activeTab === 'empresas' && isSuperAdmin ? this.renderEmpresasTab() : this.renderSucursalesTab())}
        </div>
      </div>

      <!-- Modal Crear Empresa (Super Admin) -->
      <div id="modal-empresa-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2100; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 540px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.3); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 20px;">
            <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0; display: inline-flex; align-items: center; gap: 8px;">
              ${Icons.building(18)}
              <span>Registrar Nueva Empresa Cliente</span>
            </h3>
            <button type="button" class="close-modal-btn" style="background: var(--bg-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <form id="form-crear-empresa">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Razón Social / Nombre Comercial *</label>
              <input type="text" id="emp-nombre" class="form-input" placeholder="Ej: Café Gourmet La Candelaria S.A.S." required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">NIT / Identificación Fiscal *</label>
                <input type="text" id="emp-nit" class="form-input" placeholder="Ej: 901.889.334-2" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Slug / Código de Esquema *</label>
                <input type="text" id="emp-slug" class="form-input" placeholder="ej: cafe_gourmet" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Plan Inicial *</label>
                <select id="emp-plan-select" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600;">
                  <option value="basico">Plan Básico (Pequeña Empresa)</option>
                  <option value="intermedio">Plan Crecimiento (Mediana Empresa)</option>
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">PIN Admin de Empresa *</label>
                <input type="text" id="emp-pin" class="form-input" placeholder="Ej: 123456" maxlength="6" value="123456" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 700; letter-spacing: 2px;">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
              <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-empresa" style="padding: 10px 22px; border-radius: 10px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); display: inline-flex; align-items: center; gap: 6px;">
                <span>Aprovisionar Esquema</span>
                ${Icons.arrowRight(15)}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Crear Sucursal -->
      <div id="modal-sucursal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2100; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 540px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.3); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 20px;">
            <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0; display: inline-flex; align-items: center; gap: 8px;">
              ${Icons.tenants(18)}
              <span>Registrar Nueva Sucursal</span>
            </h3>
            <button type="button" class="close-modal-btn" style="background: var(--bg-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <form id="form-crear-sucursal">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Nombre de la Sucursal / Sede *</label>
              <input type="text" id="suc-nombre" class="form-input" placeholder="Ej: Sede Norte Calle 140" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Código Único *</label>
                <input type="text" id="suc-codigo" class="form-input" placeholder="Ej: SUC-03" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">PIN de Acceso Táctil (POS) *</label>
                <input type="text" id="suc-pin" class="form-input" placeholder="Ej: 3001" maxlength="6" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 700; letter-spacing: 2px;">
              </div>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Dirección Física</label>
              <input type="text" id="suc-direccion" class="form-input" placeholder="Ej: Cra 19 # 140-30" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Teléfono de Contacto</label>
                <input type="text" id="suc-telefono" class="form-input" placeholder="Ej: +57 (1) 620-1122" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Ciudad</label>
                <input type="text" id="suc-ciudad" class="form-input" value="Bogotá D.C." style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-sucursal" style="padding: 10px 22px; border-radius: 10px; border: none; background: #059669; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                ✓ Guardar Sucursal
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Gestión de Cliente SaaS (Plan, Módulos & Auditoría) -->
      <div id="modal-plan-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(5px); align-items: center; justify-content: center; z-index: 2200; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 20px; width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); padding: 28px 32px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <span id="plan-modal-badge" class="badge" style="margin-bottom: 4px; display: inline-block;">PLAN</span>
              <h3 id="plan-modal-title" style="font-size: 19px; font-weight: 800; color: var(--text-main); margin: 0;">Gestión de Cliente SaaS</h3>
              <p id="plan-modal-subtitle" style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;"></p>
            </div>
            <button type="button" class="close-modal-btn" style="background: var(--bg-subtle); border: none; width: 34px; height: 34px; border-radius: 50%; font-size: 16px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <div id="plan-modal-content">
            <!-- Cargado dinámicamente -->
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  static renderEmpresasTab() {
    if (this.tenants.length === 0) {
      return `
        <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); padding: 40px; text-align: center;">
          <p style="color: var(--text-muted);">No hay empresas registradas.</p>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
        ${this.tenants.map((t) => {
          const isIntermedio = t.plan === 'intermedio';
          const isPersonalizado = t.plan === 'personalizado';
          const modulos = Array.isArray(t.modulosActivos) ? t.modulosActivos : [];

          return `
            <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); padding: 22px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; gap: 16px; transition: transform 0.2s, box-shadow 0.2s;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                  <span style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: var(--bg-subtle); color: #0284c7;">${Icons.building(20)}</span>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <span class="badge" style="${
                      isIntermedio
                        ? 'background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;'
                        : (isPersonalizado
                          ? 'background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;'
                          : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;')
                    } font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 6px;">
                      ${isIntermedio ? 'Plan Crecimiento' : (isPersonalizado ? 'Personalizado' : 'Plan Básico')}
                    </span>
                    <span class="badge" style="background: ${t.status === 'ACTIVE' ? '#ecfdf5' : '#fef2f2'}; color: ${t.status === 'ACTIVE' ? '#059669' : '#dc2626'}; border: 1px solid ${t.status === 'ACTIVE' ? '#a7f3d0' : '#fecaca'}; font-weight: 700; font-size: 10px;">
                      ${t.status === 'ACTIVE' ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </div>
                </div>

                <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">${t.name}</h3>
                <div style="font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 12px;">NIT: ${t.taxId || t.tax_id}</div>

                <!-- Métricas Clave de la Empresa -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                  <div style="background: var(--bg-subtle); border-radius: 10px; padding: 10px; text-align: center;">
                    <div style="font-size: 18px; font-weight: 900; color: #059669;">${t.sucursalesCount ?? 0}</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Sucursales</div>
                  </div>
                  <div style="background: var(--bg-subtle); border-radius: 10px; padding: 10px; text-align: center;">
                    <div style="font-size: 18px; font-weight: 900; color: #2563eb;">${t.usuariosCount ?? 0}</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Usuarios</div>
                  </div>
                </div>

                <!-- Módulos Activos (Feature Flags) -->
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">Módulos Habilitados:</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${modulos.includes('pos') ? '<span class="badge" style="background: #f1f5f9; color: #334155; font-size: 10px;">POS</span>' : ''}
                    ${modulos.includes('inventario') ? '<span class="badge" style="background: #f1f5f9; color: #334155; font-size: 10px;">Stock</span>' : ''}
                    ${modulos.includes('facturacion') ? '<span class="badge" style="background: #eff6ff; color: #1d4ed8; font-size: 10px;">Facturación DIAN</span>' : ''}
                    ${modulos.includes('compras') ? '<span class="badge" style="background: #eff6ff; color: #1d4ed8; font-size: 10px;">Compras</span>' : ''}
                    ${modulos.includes('empresas') ? '<span class="badge" style="background: #eff6ff; color: #1d4ed8; font-size: 10px;">Terceros</span>' : ''}
                    ${modulos.includes('contabilidad') ? '<span class="badge" style="background: #fef3c7; color: #b45309; font-size: 10px;">NIIF</span>' : ''}
                    ${modulos.includes('reportes') ? '<span class="badge" style="background: #f1f5f9; color: #334155; font-size: 10px;">Analítica</span>' : ''}
                  </div>
                </div>

                <div style="background: var(--bg-subtle); border-radius: 10px; padding: 10px 12px; font-size: 12px; display: flex; flex-direction: column; gap: 4px; color: var(--text-muted);">
                  <div>Esquema DB: <code style="color: var(--text-main); font-weight: 700;">${t.schemaName || t.schema_name}</code></div>
                  <div>PIN Maestro: <b style="color: #059669; font-family: monospace; font-size: 13px;">${t.adminPin || t.admin_pin || '123456'}</b></div>
                </div>
              </div>

              <!-- Acciones de Gestión de Cliente -->
              <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 14px; flex-wrap: wrap;">
                <button type="button" class="btn-gestionar-plan" data-id="${t.id}" style="flex: 1; min-width: 140px; padding: 9px 12px; border-radius: 8px; border: 1px solid #2563eb; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                  ${Icons.ajustes(14)}
                  <span>Configurar Módulos</span>
                </button>
                <button type="button" class="btn-seleccionar-tenant" data-slug="${t.slug}" style="padding: 9px 14px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 700; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                  <span>Ver Sucursales</span>
                  ${Icons.arrowRight(13)}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  static renderSucursalesTab() {
    if (this.sucursales.length === 0) {
      return `
        <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); padding: 50px; text-align: center;">
          <div style="color: var(--text-muted); margin-bottom: 12px;">${Icons.mapPin(36)}</div>
          <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">No hay sucursales configuradas</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">Crea la primera sucursal para que tu personal pueda ingresar con un PIN exclusivo al punto de venta.</p>
          <button type="button" class="btn-nueva-sucursal-trigger" style="background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer;">
            + Registrar Primera Sucursal
          </button>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px;">
        ${this.sucursales.map((s) => `
          <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); padding: 22px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <span style="color: #059669;">${Icons.mapPin(20)}</span>
                <span class="badge" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-weight: 700; font-size: 11px;">
                  CÓDIGO: ${s.codigo}
                </span>
              </div>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">${s.nombre}</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 12px 0;">${s.direccion || 'Sin dirección registrada'} · ${s.ciudad || 'Colombia'}</p>
              
              <!-- Tarjeta de PIN de Acceso -->
              <div style="background: #f0fdf4; border: 1.5px dashed #86efac; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">PIN de Acceso POS</div>
                  <div style="font-size: 20px; font-weight: 900; color: #15803d; letter-spacing: 4px; font-family: monospace;">
                    ${s.pinAcceso || '1001'}
                  </div>
                </div>
                <button type="button" class="btn-editar-pin" data-id="${s.id}" data-pin="${s.pinAcceso || '1001'}" data-nombre="${s.nombre}" style="background: #ffffff; border: 1px solid #86efac; color: #15803d; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                  Actualizar PIN
                </button>
              </div>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span>Tel: ${s.telefono || 'No registrado'}</span>
              <span style="color: #059669; font-weight: 700;">● Sede Activa</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  static async loadData() {
    this.isLoading = true;
    const isSuperAdmin = Boolean(state.currentUser?.esSuperAdmin);

    try {
      const promises = [ApiClient.listSucursales()];
      if (isSuperAdmin) {
        promises.push(ApiClient.listTenants());
      }

      const [sucRes, tenRes] = await Promise.all(promises);

      if (sucRes && sucRes.success) {
        this.sucursales = sucRes.data || [];
      }

      if (tenRes && tenRes.success) {
        this.tenants = tenRes.data || [];
      }
    } catch (err) {
      console.warn('Error cargando sucursales/tenants desde API:', err);
    } finally {
      this.isLoading = false;
      const content = document.getElementById('admin-content-area');
      if (content) {
        content.innerHTML = (this.activeTab === 'empresas' && isSuperAdmin)
          ? this.renderEmpresasTab()
          : this.renderSucursalesTab();
        this.bindDynamicEvents();
      }
    }
  }

  static async openPlanModal(tenantId) {
    const modal = document.getElementById('modal-plan-backdrop');
    const content = document.getElementById('plan-modal-content');
    const badge = document.getElementById('plan-modal-badge');
    const title = document.getElementById('plan-modal-title');
    const subtitle = document.getElementById('plan-modal-subtitle');

    if (!modal || !content) return;

    modal.style.display = 'flex';
    content.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">⏳ Cargando auditoría y módulos del cliente...</div>';

    try {
      const res = await ApiClient.getTenantDetalle(tenantId);
      if (!res.success) throw new Error(res.message);

      const detalle = res.data;
      const t = detalle.tenant;
      this.activeTenantDetail = detalle;

      const isIntermedio = t.plan === 'intermedio';
      const isPersonalizado = t.plan === 'personalizado';
      const modulos = Array.isArray(t.modulosActivos) ? t.modulosActivos : [];

      badge.textContent = isIntermedio ? 'PLAN CRECIMIENTO' : (isPersonalizado ? 'PERSONALIZADO' : 'PLAN BÁSICO');
      badge.style.background = isIntermedio ? '#eff6ff' : (isPersonalizado ? '#f5f3ff' : '#f0fdf4');
      badge.style.color = isIntermedio ? '#2563eb' : (isPersonalizado ? '#7c3aed' : '#16a34a');
      title.textContent = t.name;
      subtitle.textContent = `NIT: ${t.taxId} · Esquema PostgreSQL: ${t.schemaName} · PIN Maestro: ${t.adminPin || '123456'}`;

      content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Selector Rápido de Planes -->
          <div>
            <label style="display: block; font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">
              1. Selecciona o Cambia el Plan de Software:
            </label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <button type="button" id="btn-preset-basico" style="padding: 14px; border-radius: 12px; border: 2px solid ${!isIntermedio && !isPersonalizado ? '#16a34a' : 'var(--border-subtle)'}; background: ${!isIntermedio && !isPersonalizado ? '#f0fdf4' : 'var(--bg-subtle)'}; text-align: left; cursor: pointer;">
                <div style="font-size: 14px; font-weight: 800; color: #16a34a; margin-bottom: 4px;">Plan Básico</div>
                <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Para pequeñas empresas: POS en mostrador e Inventario básico diario.</div>
              </button>

              <button type="button" id="btn-preset-intermedio" style="padding: 14px; border-radius: 12px; border: 2px solid ${isIntermedio ? '#2563eb' : 'var(--border-subtle)'}; background: ${isIntermedio ? '#eff6ff' : 'var(--bg-subtle)'}; text-align: left; cursor: pointer;">
                <div style="font-size: 14px; font-weight: 800; color: #2563eb; margin-bottom: 4px;">Plan Crecimiento</div>
                <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Para medianas empresas: Facturación DIAN, Compras, Proveedores y POS.</div>
              </button>
            </div>
          </div>

          <!-- Matriz de Toggles de Módulos (Feature Flags) -->
          <div>
            <label style="display: block; font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">
              2. Interruptores de Módulos Habilitados (Feature Flags):
            </label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: var(--bg-subtle); padding: 14px; border-radius: 12px; border: 1px solid var(--border-subtle);">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" class="mod-checkbox" value="pos" ${modulos.includes('pos') ? 'checked' : ''} style="width: 16px; height: 16px;">
                <span>Punto de Venta (POS)</span>
              </label>

              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" class="mod-checkbox" value="inventario" ${modulos.includes('inventario') ? 'checked' : ''} style="width: 16px; height: 16px;">
                <span>Inventario & Stock</span>
              </label>

              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" class="mod-checkbox" value="facturacion" ${modulos.includes('facturacion') ? 'checked' : ''} style="width: 16px; height: 16px;">
                <span>Facturación DIAN</span>
              </label>

              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" class="mod-checkbox" value="compras" ${modulos.includes('compras') ? 'checked' : ''} style="width: 16px; height: 16px;">
                <span>Proveedores & Compras</span>
              </label>

              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" class="mod-checkbox" value="empresas" ${modulos.includes('empresas') ? 'checked' : ''} style="width: 16px; height: 16px;">
                <span>Terceros / CRM Clientes</span>
              </label>

              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" class="mod-checkbox" value="reportes" ${modulos.includes('reportes') ? 'checked' : ''} style="width: 16px; height: 16px;">
                <span>Reportes Analíticos BI</span>
              </label>

              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" class="mod-checkbox" value="contabilidad" ${modulos.includes('contabilidad') ? 'checked' : ''} style="width: 16px; height: 16px;">
                <span>Contabilidad NIIF/PUC</span>
              </label>

              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" class="mod-checkbox" value="ajustes" ${modulos.includes('ajustes') ? 'checked' : ''} style="width: 16px; height: 16px;">
                <span>Ajustes de Negocio</span>
              </label>
            </div>
          </div>

          <!-- Auditoría de Sucursales y Usuarios -->
          <div>
            <label style="display: block; font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">
              3. Auditoría de Recursos de la Empresa:
            </label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px; max-height: 140px; overflow-y: auto;">
                <div style="font-size: 12px; font-weight: 800; color: #059669; margin-bottom: 6px;">Sedes Registradas (${detalle.sucursales.length})</div>
                ${detalle.sucursales.length > 0 ? detalle.sucursales.map(s => `
                  <div style="font-size: 11px; padding: 4px 0; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between;">
                    <span><b>${s.nombre}</b> (${s.codigo})</span>
                    <span style="font-family: monospace; font-weight: 700; color: #059669;">PIN: ${s.pinAcceso || '1001'}</span>
                  </div>
                `).join('') : '<div style="font-size: 11px; color: var(--text-muted);">Sin sedes</div>'}
              </div>

              <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px; max-height: 140px; overflow-y: auto;">
                <div style="font-size: 12px; font-weight: 800; color: #2563eb; margin-bottom: 6px;">Usuarios Registrados (${detalle.usuarios.length})</div>
                ${detalle.usuarios.length > 0 ? detalle.usuarios.map(u => `
                  <div style="font-size: 11px; padding: 4px 0; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between;">
                    <span>${u.nombre}</span>
                    <span style="color: var(--text-muted); font-size: 10px;">${u.rolNombre || 'Usuario'}</span>
                  </div>
                `).join('') : '<div style="font-size: 11px; color: var(--text-muted);">Sin usuarios</div>'}
              </div>
            </div>
          </div>

          <!-- Botón Guardar -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
            <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
            <button type="button" id="btn-save-plan" data-id="${t.id}" style="padding: 10px 24px; border-radius: 10px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); display: inline-flex; align-items: center; gap: 8px;">
              ${Icons.save(15)} Guardar Configuración de Módulos
            </button>
          </div>
        </div>
      `;

      // Vincular eventos internos del modal
      this.bindPlanModalEvents(t.id);

    } catch (err) {
      content.innerHTML = `<div style="padding: 30px; text-align: center; color: #dc2626;">Error cargando detalles: ${err.message}</div>`;
    }
  }

  static bindPlanModalEvents(tenantId) {
    const btnBasico = document.getElementById('btn-preset-basico');
    const btnIntermedio = document.getElementById('btn-preset-intermedio');
    const checkboxes = Array.from(document.querySelectorAll('.mod-checkbox'));
    const btnSave = document.getElementById('btn-save-plan');

    let currentSelectedPlan = this.activeTenantDetail?.tenant?.plan || 'basico';

    const applySelection = (planName, modules) => {
      currentSelectedPlan = planName;
      checkboxes.forEach(cb => {
        cb.checked = modules.includes(cb.value);
      });
      if (btnBasico && btnIntermedio) {
        btnBasico.style.borderColor = planName === 'basico' ? '#16a34a' : 'var(--border-subtle)';
        btnBasico.style.background = planName === 'basico' ? '#f0fdf4' : 'var(--bg-subtle)';
        btnIntermedio.style.borderColor = planName === 'intermedio' ? '#2563eb' : 'var(--border-subtle)';
        btnIntermedio.style.background = planName === 'intermedio' ? '#eff6ff' : 'var(--bg-subtle)';
      }
    };

    if (btnBasico) {
      btnBasico.addEventListener('click', () => {
        applySelection('basico', ['pos', 'inventario', 'ajustes']);
      });
    }

    if (btnIntermedio) {
      btnIntermedio.addEventListener('click', () => {
        applySelection('intermedio', ['pos', 'inventario', 'facturacion', 'compras', 'empresas', 'reportes', 'ajustes']);
      });
    }

    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        // Al modificar manualmente, se considera personalizado
        currentSelectedPlan = 'personalizado';
        if (btnBasico && btnIntermedio) {
          btnBasico.style.borderColor = 'var(--border-subtle)';
          btnBasico.style.background = 'var(--bg-subtle)';
          btnIntermedio.style.borderColor = 'var(--border-subtle)';
          btnIntermedio.style.background = 'var(--bg-subtle)';
        }
      });
    });

    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        btnSave.disabled = true;
        btnSave.textContent = '⏳ Guardando módulos...';

        const selectedModules = checkboxes.filter(cb => cb.checked).map(cb => cb.value);

        try {
          const res = await ApiClient.updateTenantPlan(tenantId, {
            plan: currentSelectedPlan,
            modulosActivos: selectedModules,
          });

          if (res.success) {
            alert('Módulos y plan de la empresa actualizados exitosamente.');
            document.getElementById('modal-plan-backdrop').style.display = 'none';

            // Si la empresa editada es la que está en sesión, refrescar el estado
            if (state.currentTenant && state.currentTenant.id === tenantId) {
              state.setTenant(res.data);
            }

            await this.loadData();
          }
        } catch (err) {
          alert(`Error actualizando plan: ${err.message}`);
        } finally {
          btnSave.disabled = false;
          btnSave.innerHTML = `${Icons.save(15)} Guardar Configuración de Módulos`;
        }
      });
    }
  }

  static bindEvents() {
    // Cambio de Pestañas
    document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
        this.loadData();
      });
    });

    // Abrir Modal Crear Empresa
    const btnNuevaEmpresa = document.getElementById('btn-nueva-empresa');
    if (btnNuevaEmpresa) {
      btnNuevaEmpresa.addEventListener('click', () => {
        const modal = document.getElementById('modal-empresa-backdrop');
        if (modal) modal.style.display = 'flex';
      });
    }

    // Abrir Modal Crear Sucursal
    const btnNuevaSucursal = document.getElementById('btn-nueva-sucursal');
    if (btnNuevaSucursal) {
      btnNuevaSucursal.addEventListener('click', () => {
        const modal = document.getElementById('modal-sucursal-backdrop');
        if (modal) modal.style.display = 'flex';
      });
    }

    // Cerrar Modales
    document.querySelectorAll('.close-modal-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m1 = document.getElementById('modal-empresa-backdrop');
        const m2 = document.getElementById('modal-sucursal-backdrop');
        const m3 = document.getElementById('modal-plan-backdrop');
        if (m1) m1.style.display = 'none';
        if (m2) m2.style.display = 'none';
        if (m3) m3.style.display = 'none';
      });
    });

    // Enviar Formulario de Crear Empresa
    const formEmpresa = document.getElementById('form-crear-empresa');
    if (formEmpresa) {
      formEmpresa.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-empresa');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Aprovisionando esquema...';

        try {
          const name = document.getElementById('emp-nombre').value.trim();
          const taxId = document.getElementById('emp-nit').value.trim();
          const slug = document.getElementById('emp-slug').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const adminPin = document.getElementById('emp-pin').value.trim();
          const plan = document.getElementById('emp-plan-select').value;

          const res = await ApiClient.createTenant({ name, taxId, slug, adminPin, plan });
          if (res.success) {
            alert(`Empresa "${name}" registrada exitosamente con esquema aislado y plan ${plan}.`);
            document.getElementById('modal-empresa-backdrop').style.display = 'none';
            formEmpresa.reset();
            await this.loadData();
          }
        } catch (err) {
          alert(`Error al crear empresa: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `${Icons.save(15)} Crear y Aprovisionar Esquema`;
        }
      });
    }

    // Enviar Formulario de Crear Sucursal
    const formSucursal = document.getElementById('form-crear-sucursal');
    if (formSucursal) {
      formSucursal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-sucursal');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        try {
          const nombre = document.getElementById('suc-nombre').value.trim();
          const codigo = document.getElementById('suc-codigo').value.trim();
          const pinAcceso = document.getElementById('suc-pin').value.trim();
          const direccion = document.getElementById('suc-direccion').value.trim();
          const telefono = document.getElementById('suc-telefono').value.trim();
          const ciudad = document.getElementById('suc-ciudad').value.trim();

          const res = await ApiClient.createSucursal({
            nombre,
            codigo,
            pinAcceso,
            direccion,
            telefono,
            ciudad,
          });

          if (res.success) {
            alert(`Sucursal "${nombre}" creada con éxito con PIN de acceso: ${pinAcceso}`);
            document.getElementById('modal-sucursal-backdrop').style.display = 'none';
            formSucursal.reset();
            await this.loadData();
          }
        } catch (err) {
          alert(`Error al crear sucursal: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `${Icons.save(15)} Guardar Sucursal`;
        }
      });
    }

    // Botón Refresh
    const btnRefresh = document.getElementById('btn-refresh-admin');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadData());
    }

    this.bindDynamicEvents();
  }

  static bindDynamicEvents() {
    // Abrir Modal de Gestión de Plan & Módulos
    document.querySelectorAll('.btn-gestionar-plan').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tenantId = btn.getAttribute('data-id');
        this.openPlanModal(tenantId);
      });
    });

    // Cambiar PIN de Sucursal
    document.querySelectorAll('.btn-editar-pin').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const currentPin = btn.getAttribute('data-pin');
        const nombre = btn.getAttribute('data-nombre');

        const nuevoPin = prompt(`Ingresa el nuevo PIN de acceso para la sucursal "${nombre}":`, currentPin);
        if (nuevoPin && nuevoPin.trim() && nuevoPin.trim() !== currentPin) {
          try {
            await ApiClient.updateSucursal(id, { pinAcceso: nuevoPin.trim() });
            alert(`PIN de la sucursal "${nombre}" actualizado a: ${nuevoPin.trim()}`);
            await this.loadData();
          } catch (err) {
            alert(`Error actualizando PIN: ${err.message}`);
          }
        }
      });
    });

    // Botón Seleccionar Tenant (Super Admin)
    document.querySelectorAll('.btn-seleccionar-tenant').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-slug');
        state.setTenant(slug);
        this.activeTab = 'sucursales';
        this.render();
        this.loadData();
      });
    });

    // Trigger para registrar primera sucursal
    document.querySelectorAll('.btn-nueva-sucursal-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = document.getElementById('modal-sucursal-backdrop');
        if (modal) modal.style.display = 'flex';
      });
    });
  }
}
