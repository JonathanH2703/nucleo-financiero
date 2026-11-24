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
    this.allSucursales = [];
    this.activeTenantDetail = null;
    this.selectedTenant = state.currentTenant;
    this.activeTab = state.currentUser?.esSuperAdmin ? 'empresas' : 'sucursales';
    this.sucFilter = '';
    this.empPage = 1;
    this.sucPage = 1;
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
              Empresas Clientes (<span id="tab-count-empresas">${this.tenants.length}</span>)
            </button>
            <button type="button" class="admin-tab-btn ${this.activeTab === 'sucursales' ? 'active' : ''}" data-tab="sucursales" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'sucursales' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'sucursales' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer;">
              Sedes Físicas (<span id="tab-count-sucursales">${isSuperAdmin ? this.allSucursales.length : this.sucursales.length}</span>)
            </button>
          </div>
        ` : ''}

        <!-- Contenedor Principal de Contenido -->
        <div id="admin-content-area">
          ${this.isLoading ? `
            <div style="padding: 60px; text-align: center; color: var(--text-muted);">
              Cargando catálogo de infraestructura y planes...
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
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">NIT o Cédula (C.C.) *</label>
                <input type="text" id="emp-nit" class="form-input" placeholder="Ej: 901.889.334-2 o 1.020.345.678" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
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

    const pageSize = 6;
    const currentPage = this.empPage || 1;
    const totalPages = Math.max(1, Math.ceil(this.tenants.length / pageSize));
    const validPage = Math.min(currentPage, totalPages);
    const paged = this.tenants.slice((validPage - 1) * pageSize, validPage * pageSize);

    return `
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">${this.tenants.length} empresa${this.tenants.length !== 1 ? 's' : ''} registrada${this.tenants.length !== 1 ? 's' : ''}</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
        ${paged.map((t) => {
      const isIntermedio = t.plan === 'intermedio';
      const isPersonalizado = t.plan === 'personalizado';
      const modulos = Array.isArray(t.modulosActivos) ? t.modulosActivos : [];

      return `
            <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); padding: 22px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; gap: 16px; transition: transform 0.2s, box-shadow 0.2s;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                  <span style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: var(--bg-subtle); color: #0284c7;">${Icons.building(20)}</span>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <span class="badge" style="${isIntermedio
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
                <div style="font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 12px;">NIT / C.C.: ${t.taxId || t.tax_id}</div>

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
      ${this.renderPagination(validPage, totalPages, 'emp')}
    `;
  }

  static renderSucursalesTab() {
    const isSuperAdmin = Boolean(state.currentUser?.esSuperAdmin);
    const sourceList = isSuperAdmin ? (this.allSucursales || []) : (this.sucursales || []);

    // Aplicar filtro por empresa (solo super admin)
    let filtered = sourceList;
    if (isSuperAdmin && this.sucFilter) {
      filtered = sourceList.filter(s => s.tenantSlug === this.sucFilter);
    }

    // Paginación
    const pageSize = 8;
    const currentPage = this.sucPage || 1;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const validPage = Math.min(currentPage, totalPages);
    const paged = filtered.slice((validPage - 1) * pageSize, validPage * pageSize);

    // Barra de filtros (solo super admin)
    const selectedTenant = this.sucFilter ? this.tenants.find(t => t.slug === this.sucFilter) : null;
    const selectedTenantName = selectedTenant ? selectedTenant.name : '';

    const filterBar = isSuperAdmin ? `
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; background: var(--bg-card); padding: 14px 18px; border-radius: 12px; border: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 280px; flex-wrap: wrap;">
          <label for="suc-filter-input" style="font-size: 12px; font-weight: 700; color: var(--text-muted); white-space: nowrap;">Filtrar por empresa:</label>
          <div style="position: relative; flex: 1; min-width: 240px; max-width: 360px;">
            <div style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; display: flex; align-items: center;">
              ${Icons.search(15)}
            </div>
            <input
              type="text"
              id="suc-filter-input"
              placeholder="Buscar por nombre o NIT..."
              value="${selectedTenantName}"
              autocomplete="off"
              style="width: 100%; padding: 8px 32px 8px 32px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-size: 13px; font-weight: 600; outline: none; box-sizing: border-box;"
            />
            <button
              type="button"
              id="suc-filter-clear"
              title="Limpiar filtro"
              style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 13px; padding: 2px 6px; border-radius: 4px; display: ${this.sucFilter ? 'block' : 'none'}; line-height: 1;"
            >✕</button>
            <div
              id="suc-filter-dropdown"
              style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; max-height: 250px; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2); z-index: 100;"
            ></div>
          </div>
          ${selectedTenant ? `
            <div style="display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; white-space: nowrap;">
              <span>Filtrado: ${selectedTenant.name}</span>
              <button type="button" class="btn-remover-filtro-tag" style="background: none; border: none; color: #1d4ed8; cursor: pointer; font-size: 12px; padding: 0; line-height: 1; font-weight: 800;" title="Quitar filtro">✕</button>
            </div>
          ` : ''}
        </div>
        <span style="font-size: 12px; color: var(--text-muted); margin-left: auto; white-space: nowrap;">${filtered.length} sede${filtered.length !== 1 ? 's' : ''} ${this.sucFilter ? 'encontrada' : 'registrada'}${filtered.length !== 1 ? 's' : ''}</span>
      </div>
    ` : '';

    if (paged.length === 0) {
      return `
        ${filterBar}
        <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); padding: 50px; text-align: center;">
          <div style="color: var(--text-muted); margin-bottom: 12px;">${Icons.mapPin(36)}</div>
          <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">${this.sucFilter ? 'No hay sedes para esta empresa' : 'No hay sucursales configuradas'}</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">
            ${this.sucFilter
              ? 'La empresa seleccionada aún no tiene sedes registradas.'
              : 'Crea la primera sucursal para que tu personal pueda ingresar con un PIN exclusivo al punto de venta.'}
          </p>
          ${!this.sucFilter ? `
            <button type="button" class="btn-nueva-sucursal-trigger" style="background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer;">
              + Registrar Primera Sucursal
            </button>
          ` : ''}
        </div>
      `;
    }

    return `
      ${filterBar}
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px;">
        ${paged.map((s) => `
          <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); padding: 22px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <span style="color: #059669;">${Icons.mapPin(20)}</span>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                  ${isSuperAdmin && s.tenantName ? `
                    <span style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-weight: 700; font-size: 10px; padding: 2px 8px; border-radius: 6px; white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis;">
                      ${s.tenantName}
                    </span>
                  ` : ''}
                  <span class="badge" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-weight: 700; font-size: 11px;">
                    CÓDIGO: ${s.codigo}
                  </span>
                </div>
              </div>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">${s.nombre}</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 12px 0;">${s.direccion || 'Sin dirección registrada'} · ${s.ciudad || 'Colombia'}</p>
              
              <!-- Tarjeta de PIN de Acceso -->
              <div style="background: #f0fdf4; border: 1.5px dashed #86efac; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">PIN de Acceso POS</div>
                  <div style="font-size: 20px; font-weight: 900; color: #15803d; letter-spacing: 4px; font-family: monospace;">
                    ${s.pinAcceso || s.pin_acceso || '1001'}
                  </div>
                </div>
                <button type="button" class="btn-editar-pin" data-id="${s.id}" data-pin="${s.pinAcceso || s.pin_acceso || '1001'}" data-nombre="${s.nombre}" style="background: #ffffff; border: 1px solid #86efac; color: #15803d; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                  Actualizar PIN
                </button>
              </div>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span>Tel: ${s.telefono || 'No registrado'}</span>
              <span style="color: ${s.activo !== false ? '#059669' : '#dc2626'}; font-weight: 700;">● ${s.activo !== false ? 'Sede Activa' : 'Inactiva'}</span>
            </div>
          </div>
        `).join('')}
      </div>
      ${this.renderPagination(validPage, totalPages, 'suc')}
    `;
  }

  static renderPagination(currentPage, totalPages, prefix) {
    if (totalPages <= 1) return '';

    const btnBase = 'padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;';
    const btnActive = 'background: #2563eb; color: #fff; border: 1px solid #2563eb;';
    const btnNormal = 'background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-subtle);';
    const btnDisabled = 'opacity: 0.4; cursor: default; pointer-events: none;';

    let pages = '';
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
        const isActive = i === currentPage;
        pages += `<button type="button" class="page-btn" data-prefix="${prefix}" data-page="${i}" style="${btnBase} ${isActive ? btnActive : btnNormal}">${i}</button>`;
      } else if ((i === 2 && currentPage > 4) || (i === totalPages - 1 && currentPage < totalPages - 3)) {
        pages += '<span style="color: var(--text-muted); padding: 0 4px;">...</span>';
      }
    }

    return `
      <div style="display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
        <button type="button" class="page-btn" data-prefix="${prefix}" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} style="${btnBase} ${currentPage <= 1 ? btnDisabled : btnNormal}">
          Anterior
        </button>
        ${pages}
        <button type="button" class="page-btn" data-prefix="${prefix}" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} style="${btnBase} ${currentPage >= totalPages ? btnDisabled : btnNormal}">
          Siguiente
        </button>
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
        promises.push(ApiClient.listAllSucursalesGlobal());
      }

      const [sucRes, tenRes, globalSucRes] = await Promise.all(promises);

      if (sucRes && sucRes.success) {
        this.sucursales = sucRes.data || [];
      } else {
        this.sucursales = [];
      }

      if (tenRes && tenRes.success) {
        this.tenants = tenRes.data || [];
      }

      if (globalSucRes && globalSucRes.success) {
        this.allSucursales = globalSucRes.data || [];
      }
    } catch (err) {
      console.warn('Error cargando sucursales/tenants desde API:', err);
      this.sucursales = [];
    } finally {
      this.isLoading = false;
      const content = document.getElementById('admin-content-area');
      if (content) {
        content.innerHTML = (this.activeTab === 'empresas' && isSuperAdmin)
          ? this.renderEmpresasTab()
          : this.renderSucursalesTab();
        this.bindDynamicEvents();
      }

      // Actualizar contadores de pestañas
      const tabEmp = document.getElementById('tab-count-empresas');
      const tabSuc = document.getElementById('tab-count-sucursales');
      if (tabEmp) tabEmp.textContent = this.tenants.length;
      if (tabSuc) tabSuc.textContent = isSuperAdmin ? this.allSucursales.length : this.sucursales.length;
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
    content.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">Cargando auditoría y módulos del cliente...</div>';

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
      subtitle.textContent = `NIT / C.C.: ${t.taxId} · Esquema: ${t.schemaName} · PIN Maestro: ${t.adminPin || '123456'}`;

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
            <button type="button" id="btn-cancelar-plan" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
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
    const btnCancel = document.getElementById('btn-cancelar-plan');

    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        const modal = document.getElementById('modal-plan-backdrop');
        if (modal) modal.style.display = 'none';
      });
    }

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
        btnSave.textContent = 'Guardando módulos...';

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
        if (this.activeTab === 'sucursales') { this.sucPage = 1; }
        if (this.activeTab === 'empresas') { this.empPage = 1; }
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

    // Cerrar Modales (botones, clics fuera en el backdrop y tecla Escape)
    const modalIds = ['modal-empresa-backdrop', 'modal-sucursal-backdrop', 'modal-plan-backdrop'];

    const closeAllModals = () => {
      modalIds.forEach((id) => {
        const m = document.getElementById(id);
        if (m) m.style.display = 'none';
      });
    };

    // Botones estáticos y dinámicos para cerrar
    document.querySelectorAll('.close-modal-btn').forEach((btn) => {
      btn.addEventListener('click', closeAllModals);
    });

    // Cerrar al hacer clic en el backdrop exterior (fuera de la ventana modal)
    modalIds.forEach((id) => {
      const backdrop = document.getElementById(id);
      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) {
            backdrop.style.display = 'none';
          }
        });
      }
    });

    // Cerrar modales con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
      }
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

    // Botón Ver Sucursales (filtra por empresa seleccionada)
    document.querySelectorAll('.btn-seleccionar-tenant').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-slug');
        this.sucFilter = slug;
        this.sucPage = 1;
        this.activeTab = 'sucursales';
        this.render();
      });
    });

    // Filtro interactivo de empresa en sedes (búsqueda predictiva con coincidencias)
    const filterInput = document.getElementById('suc-filter-input');
    const filterClear = document.getElementById('suc-filter-clear');
    const filterDropdown = document.getElementById('suc-filter-dropdown');
    const tagRemover = document.querySelector('.btn-remover-filtro-tag');

    const applyFilter = (newSlug) => {
      this.sucFilter = newSlug || '';
      this.sucPage = 1;
      const content = document.getElementById('admin-content-area');
      if (content) {
        content.innerHTML = this.renderSucursalesTab();
        this.bindDynamicEvents();
      }
      const tabSuc = document.getElementById('tab-count-sucursales');
      if (tabSuc) {
        const all = this.allSucursales || [];
        const filtered = this.sucFilter ? all.filter(s => s.tenantSlug === this.sucFilter) : all;
        tabSuc.textContent = filtered.length;
      }
    };

    if (tagRemover) {
      tagRemover.addEventListener('click', () => applyFilter(''));
    }

    if (filterClear) {
      filterClear.addEventListener('click', () => applyFilter(''));
    }

    if (filterInput && filterDropdown) {
      const renderDropdownOptions = (query = '') => {
        const q = query.trim().toLowerCase();
        const allTenants = this.tenants || [];
        const matches = q
          ? allTenants.filter(t =>
              (t.name && t.name.toLowerCase().includes(q)) ||
              (t.slug && t.slug.toLowerCase().includes(q)) ||
              (t.nit && t.nit.toLowerCase().includes(q))
            )
          : allTenants;

        let html = `
          <div class="suc-filter-option" data-slug="" style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: var(--text-muted); cursor: pointer; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; transition: background 0.15s;">
            <span>Todas las empresas (ver todo)</span>
            <span style="font-size: 11px; background: var(--bg-subtle); padding: 2px 7px; border-radius: 4px;">${(this.allSucursales || []).length} sedes</span>
          </div>
        `;

        if (matches.length === 0) {
          html += `
            <div style="padding: 16px; font-size: 12px; color: var(--text-muted); text-align: center;">
              No se encontraron empresas con "<strong>${query}</strong>"
            </div>
          `;
        } else {
          matches.forEach(t => {
            const sedeCount = (this.allSucursales || []).filter(s => s.tenantSlug === t.slug).length;
            const isSelected = this.sucFilter === t.slug;
            html += `
              <div class="suc-filter-option" data-slug="${t.slug}" data-name="${t.name}" style="padding: 10px 14px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: ${isSelected ? 'var(--bg-subtle)' : 'transparent'}; border-bottom: 1px solid var(--border-subtle); transition: background 0.15s;">
                <div style="display: flex; flex-direction: column;">
                  <span style="font-weight: 600; color: var(--text-main);">${t.name}</span>
                  ${t.nit ? `<span style="font-size: 10px; color: var(--text-muted);">NIT: ${t.nit}</span>` : ''}
                </div>
                <span style="font-size: 10px; font-weight: 700; color: var(--text-muted); background: var(--bg-subtle); padding: 2px 7px; border-radius: 6px; white-space: nowrap;">
                  ${sedeCount} sede${sedeCount !== 1 ? 's' : ''}
                </span>
              </div>
            `;
          });
        }

        filterDropdown.innerHTML = html;
        filterDropdown.style.display = 'block';

        filterDropdown.querySelectorAll('.suc-filter-option').forEach(opt => {
          opt.addEventListener('mouseenter', () => { opt.style.background = 'var(--bg-subtle)'; });
          opt.addEventListener('mouseleave', () => {
            const isSelected = this.sucFilter === opt.getAttribute('data-slug');
            opt.style.background = isSelected ? 'var(--bg-subtle)' : 'transparent';
          });
          opt.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const slug = opt.getAttribute('data-slug') || '';
            filterDropdown.style.display = 'none';
            applyFilter(slug);
          });
        });
      };

      filterInput.addEventListener('focus', () => {
        renderDropdownOptions(filterInput.value);
      });

      filterInput.addEventListener('input', () => {
        if (filterClear) filterClear.style.display = filterInput.value ? 'block' : 'none';
        renderDropdownOptions(filterInput.value);
      });

      filterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const firstOption = filterDropdown.querySelector('.suc-filter-option');
          if (firstOption) {
            const slug = firstOption.getAttribute('data-slug') || '';
            filterDropdown.style.display = 'none';
            applyFilter(slug);
          }
        } else if (e.key === 'Escape') {
          filterDropdown.style.display = 'none';
        }
      });

      filterInput.addEventListener('blur', () => {
        setTimeout(() => {
          if (filterDropdown) filterDropdown.style.display = 'none';
        }, 220);
      });
    }

    // Paginación
    document.querySelectorAll('.page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const prefix = btn.getAttribute('data-prefix');
        const page = parseInt(btn.getAttribute('data-page'), 10);
        if (isNaN(page) || page < 1) return;
        if (prefix === 'emp') this.empPage = page;
        if (prefix === 'suc') this.sucPage = page;
        const content = document.getElementById('admin-content-area');
        if (content) {
          const isSuperAdmin = Boolean(state.currentUser?.esSuperAdmin);
          content.innerHTML = (this.activeTab === 'empresas' && isSuperAdmin)
            ? this.renderEmpresasTab()
            : this.renderSucursalesTab();
          this.bindDynamicEvents();
        }
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
