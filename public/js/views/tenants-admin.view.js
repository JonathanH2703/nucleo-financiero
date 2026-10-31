/**
 * VISTA DE GESTIÓN DE EMPRESAS Y SUCURSALES — NÚCLEO FINANCIERO
 * Permite al Administrador del Sistema crear y gestionar empresas (Tenants)
 * y a los Administradores de Empresa gestionar sus sucursales y sus respectivos PINs de acceso.
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

export class TenantsAdminView {
  static async mount(container) {
    this.container = container;
    this.tenants = [];
    this.sucursales = [];
    this.selectedTenant = state.currentTenant;
    this.activeTab = state.currentUser?.esSuperAdmin ? 'empresas' : 'sucursales';
    this.isLoading = true;

    this.render();
    await this.loadData();
  }

  static render() {
    const isSuperAdmin = Boolean(state.currentUser?.esSuperAdmin);

    this.container.innerHTML = `
      <div class="tenants-admin-container" style="max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 18px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <span style="font-size: 26px;">🏢</span>
              <h1 style="font-size: 22px; font-weight: 800; color: var(--text-main); margin: 0;">
                ${isSuperAdmin ? 'Gestión de Empresas & Sucursales de Plataforma' : `Sucursales y Sedes de ${state.currentTenant.name}`}
              </h1>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
              ${isSuperAdmin 
                ? 'Administración multi-tenant global. Cada empresa opera en su propio esquema de base de datos con aislamiento estricto.' 
                : 'Configura las sucursales físicas de tu negocio. Cada sucursal accede con su propio PIN independiente para operar el POS.'}
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <button type="button" id="btn-refresh-admin" style="background: var(--bg-card); border: 1px solid var(--border-subtle); color: var(--text-main); padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              🔄 Actualizar
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
              🏢 Empresas Registradas (${this.tenants.length})
            </button>
            <button type="button" class="admin-tab-btn ${this.activeTab === 'sucursales' ? 'active' : ''}" data-tab="sucursales" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'sucursales' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'sucursales' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer;">
              📍 Sucursales y PINs (${this.sucursales.length})
            </button>
          </div>
        ` : ''}

        <!-- Contenedor Principal de Contenido -->
        <div id="admin-content-area">
          ${this.isLoading ? `
            <div style="padding: 60px; text-align: center; color: var(--text-muted);">
              ⏳ Cargando catálogo de infraestructura...
            </div>
          ` : (this.activeTab === 'empresas' && isSuperAdmin ? this.renderEmpresasTab() : this.renderSucursalesTab())}
        </div>
      </div>

      <!-- Modal Crear Empresa (Super Admin) -->
      <div id="modal-empresa-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2100; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 540px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.3); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 20px;">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">🏢 Registrar Nueva Empresa</h3>
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

            <div style="margin-bottom: 20px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">PIN Maestro de Administrador de Empresa *</label>
              <input type="password" id="emp-pin" class="form-input" placeholder="Ej: 123456" maxlength="6" value="123456" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-size: 16px; letter-spacing: 4px;">
              <span style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block;">Con este PIN y el NIT, el dueño o gerente accederá al panel de administración.</span>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-empresa" style="padding: 10px 22px; border-radius: 10px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                🚀 Crear y Aprovisionar Esquema
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Crear Sucursal -->
      <div id="modal-sucursal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2100; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 540px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.3); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 20px;">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">📍 Registrar Nueva Sucursal</h3>
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
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px;">
        ${this.tenants.map((t) => `
          <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); padding: 22px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <span style="font-size: 24px;">🏛️</span>
                <span class="badge" style="background: ${t.status === 'ACTIVE' ? '#ecfdf5' : '#fef2f2'}; color: ${t.status === 'ACTIVE' ? '#059669' : '#dc2626'}; border: 1px solid ${t.status === 'ACTIVE' ? '#a7f3d0' : '#fecaca'}; font-weight: 700; font-size: 11px;">
                  ${t.status === 'ACTIVE' ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">${t.name}</h3>
              <div style="font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 8px;">${t.taxId || t.tax_id}</div>
              
              <div style="background: var(--bg-subtle); border-radius: 10px; padding: 10px 12px; font-size: 12px; display: flex; flex-direction: column; gap: 4px; color: var(--text-muted);">
                <div>Esquema: <code style="color: var(--text-main); font-weight: 700;">${t.schemaName || t.schema_name}</code></div>
                <div>PIN Admin: <b style="color: #059669; font-family: monospace; font-size: 13px;">${t.adminPin || t.admin_pin || '123456'}</b></div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <button type="button" class="btn-seleccionar-tenant" data-slug="${t.slug}" style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid #2563eb; background: #eff6ff; color: #2563eb; font-weight: 700; font-size: 12px; cursor: pointer;">
                Gestionar Sucursales ➔
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  static renderSucursalesTab() {
    if (this.sucursales.length === 0) {
      return `
        <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); padding: 50px; text-align: center;">
          <span style="font-size: 40px; display: block; margin-bottom: 12px;">📍</span>
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
                <span style="font-size: 24px;">📍</span>
                <span class="badge" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-weight: 700; font-size: 11px;">
                  CÓDIGO: ${s.codigo}
                </span>
              </div>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">${s.nombre}</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 12px 0;">${s.direccion || 'Sin dirección registrada'} · ${s.ciudad || 'Bogotá D.C.'}</p>
              
              <!-- Tarjeta de PIN de Acceso -->
              <div style="background: #f0fdf4; border: 1.5px dashed #86efac; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">PIN de Acceso POS</div>
                  <div style="font-size: 20px; font-weight: 900; color: #15803d; letter-spacing: 4px; font-family: monospace;">
                    ${s.pinAcceso || '1001'}
                  </div>
                </div>
                <button type="button" class="btn-editar-pin" data-id="${s.id}" data-pin="${s.pinAcceso || '1001'}" data-nombre="${s.nombre}" style="background: #ffffff; border: 1px solid #86efac; color: #15803d; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                  ✏️ Cambiar PIN
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
        if (m1) m1.style.display = 'none';
        if (m2) m2.style.display = 'none';
      });
    });

    // Enviar Formulario de Crear Empresa
    const formEmpresa = document.getElementById('form-crear-empresa');
    if (formEmpresa) {
      formEmpresa.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-empresa');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Aprovisionando esquema...';

        try {
          const name = document.getElementById('emp-nombre').value.trim();
          const taxId = document.getElementById('emp-nit').value.trim();
          const slug = document.getElementById('emp-slug').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const adminPin = document.getElementById('emp-pin').value.trim();

          const res = await ApiClient.createTenant({ name, taxId, slug, adminPin });
          if (res.success) {
            alert(`✅ ¡Empresa "${name}" registrada exitosamente con esquema de base de datos aislado y PIN maestro!`);
            document.getElementById('modal-empresa-backdrop').style.display = 'none';
            formEmpresa.reset();
            await this.loadData();
          }
        } catch (err) {
          alert(`❌ Error al crear empresa: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚀 Crear y Aprovisionar Esquema';
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
        submitBtn.textContent = '⏳ Guardando...';

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
            alert(`✅ Sucursal "${nombre}" creada con éxito con PIN de acceso: ${pinAcceso}`);
            document.getElementById('modal-sucursal-backdrop').style.display = 'none';
            formSucursal.reset();
            await this.loadData();
          }
        } catch (err) {
          alert(`❌ Error al crear sucursal: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '✓ Guardar Sucursal';
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
            alert(`✅ PIN de la sucursal "${nombre}" actualizado a: ${nuevoPin.trim()}`);
            await this.loadData();
          } catch (err) {
            alert(`❌ Error actualizando PIN: ${err.message}`);
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
