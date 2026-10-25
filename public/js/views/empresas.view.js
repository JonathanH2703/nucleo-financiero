/**
 * VISTA DE GESTIÓN DE EMPRESAS Y TERCEROS — NÚCLEO FINANCIERO
 * Permite registrar y clasificar empresas como Clientes, Proveedores o Ambos.
 * Integrado con el backend de Terceros y la facturación electrónica DIAN.
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

export class EmpresasView {
  static async mount(container) {
    this.container = container;
    this.terceros = [];
    this.filtroTipo = 'todos';
    this.searchTerm = '';
    this.isLoading = true;

    this.render();
    await this.cargarTerceros();
  }

  static render() {
    this.container.innerHTML = `
      <div class="empresas-view-container">
        <!-- Header -->
        <div class="empresas-header-row">
          <div>
            <h1 class="empresas-header-title">
              <span>🏢</span> Directorio de Empresas y Terceros
            </h1>
            <p class="empresas-header-desc">
              Administra clientes, proveedores o entidades mixtas. Las empresas registradas aquí se autocompletan en la emisión de facturas.
            </p>
          </div>
          <div class="empresas-header-actions" style="display: flex; gap: 10px; align-items: center;">
            <button type="button" class="btn-refresh-empresas" id="btn-refresh-empresas" style="background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a; padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              🔄 Actualizar
            </button>
            <button type="button" class="btn-nueva-empresa" id="btn-nueva-empresa" style="background: #2563eb !important; color: #ffffff !important; border: none !important; padding: 10px 20px !important; border-radius: 10px !important; font-size: 13px !important; font-weight: 700 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; gap: 8px !important; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;">
              <span style="font-size: 16px; font-weight: 800;">+</span> Registrar Empresa
            </button>
          </div>
        </div>

        <!-- Filtros y Búsqueda -->
        <div class="empresas-toolbar">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="empresa-filter-pill ${this.filtroTipo === 'todos' ? 'active' : ''}" data-filtro="todos">
              Todos (${this.terceros.length})
            </button>
            <button type="button" class="empresa-filter-pill ${this.filtroTipo === 'cliente' ? 'active' : ''}" data-filtro="cliente">
              👤 Solo Clientes
            </button>
            <button type="button" class="empresa-filter-pill ${this.filtroTipo === 'proveedor' ? 'active' : ''}" data-filtro="proveedor">
              🚚 Solo Proveedores
            </button>
            <button type="button" class="empresa-filter-pill ${this.filtroTipo === 'ambos' ? 'active' : ''}" data-filtro="ambos">
              🔄 Ambos
            </button>
          </div>
          <div style="position: relative; min-width: 280px;">
            <input type="text" id="input-buscar-empresa" class="empresas-search-input" value="${this.searchTerm}" placeholder="🔍 Buscar por razón social, NIT o email...">
          </div>
        </div>

        <!-- Tabla -->
        <div class="empresas-table-card">
          <div id="empresas-table-container">
            ${this.renderTableContent()}
          </div>
        </div>
      </div>

      <!-- Modal de Registro -->
      <div id="modal-empresa-backdrop" class="modal-empresa-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2100; padding: 20px;">
        <div class="modal-empresa-card" style="background: #ffffff; border-radius: 18px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25); padding: 26px 30px; border: 1px solid #e2e8f0; position: relative;">
          <!-- Header del modal -->
          <div class="modal-empresa-header" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <h2 class="modal-empresa-title" style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
                🏢 Registrar Empresa / Tercero
              </h2>
              <p class="modal-empresa-subtitle" style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">
                Completa los datos de la entidad y define su rol comercial en el sistema.
              </p>
            </div>
            <button type="button" id="btn-cerrar-modal-empresa" class="modal-empresa-close-btn" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700;">✕</button>
          </div>

          <!-- Formulario -->
          <form id="form-registro-empresa">
            <!-- Clasificación Comercial -->
            <div class="clasificacion-box" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;">
              <div class="clasificacion-title" style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span>CLASIFICACIÓN COMERCIAL *</span>
                <span style="font-size: 11px; font-weight: 500; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 6px;">💡 Puedes marcar ambas</span>
              </div>
              <div class="clasificacion-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <label class="clasificacion-card" id="card-es-cliente" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; background: #ffffff; border-radius: 10px; cursor: pointer; transition: all 0.2s ease;">
                  <input type="checkbox" id="chk-es-cliente" checked style="width: 18px; height: 18px; accent-color: #2563eb; cursor: pointer;">
                  <div class="clasificacion-card-label" style="display: flex; flex-direction: column;">
                    <strong style="font-size: 13px; color: #0f172a;">👤 Cliente</strong>
                    <span style="font-size: 11px; color: #64748b;">Emisión de facturas DIAN</span>
                  </div>
                </label>
                <label class="clasificacion-card" id="card-es-proveedor" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; background: #ffffff; border-radius: 10px; cursor: pointer; transition: all 0.2s ease;">
                  <input type="checkbox" id="chk-es-proveedor" style="width: 18px; height: 18px; accent-color: #2563eb; cursor: pointer;">
                  <div class="clasificacion-card-label" style="display: flex; flex-direction: column;">
                    <strong style="font-size: 13px; color: #0f172a;">🚚 Proveedor</strong>
                    <span style="font-size: 11px; color: #64748b;">Compras y gastos</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Tipo y Número de Documento -->
            <div class="form-grid-doc form-field-group" style="display: grid; grid-template-columns: 140px 1fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label class="form-field-label" style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Tipo Doc. <span class="required" style="color: #dc2626;">*</span></label>
                <select id="emp-tipo-doc" class="form-field-select" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #0f172a;">
                  <option value="NIT" selected>NIT (Empresa)</option>
                  <option value="CC">Cédula (CC)</option>
                  <option value="CE">Extranjería (CE)</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label class="form-field-label" style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Número Documento / NIT <span class="required" style="color: #dc2626;">*</span></label>
                <input type="text" id="emp-numero-doc" class="form-field-input" required placeholder="Ej: 900.876.543-1" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #0f172a;">
              </div>
            </div>

            <!-- Razón Social -->
            <div class="form-field-group" style="margin-bottom: 14px;">
              <label class="form-field-label" style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Razón Social o Nombre Completo <span class="required" style="color: #dc2626;">*</span></label>
              <input type="text" id="emp-razon-social" class="form-field-input" required placeholder="Ej: Inversiones y Servicios del Valle S.A.S." style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #0f172a;">
            </div>

            <!-- Email y Teléfono -->
            <div class="form-grid-2 form-field-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label class="form-field-label" style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Correo Electrónico</label>
                <input type="email" id="emp-email" class="form-field-input" placeholder="facturacion@empresa.com" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #0f172a;">
              </div>
              <div>
                <label class="form-field-label" style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Teléfono / Móvil</label>
                <input type="text" id="emp-telefono" class="form-field-input" placeholder="Ej: +57 310 987 6543" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #0f172a;">
              </div>
            </div>

            <!-- Dirección y Ciudad -->
            <div class="form-grid-dir form-field-group" style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label class="form-field-label" style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Dirección Física</label>
                <input type="text" id="emp-direccion" class="form-field-input" placeholder="Ej: Calle 72 # 11-45 Of. 502" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #0f172a;">
              </div>
              <div>
                <label class="form-field-label" style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Ciudad</label>
                <input type="text" id="emp-ciudad" class="form-field-input" placeholder="Ej: Bogotá" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #0f172a;">
              </div>
            </div>

            <!-- Botones de Acción -->
            <div class="modal-empresa-footer" style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 22px;">
              <button type="button" id="btn-cancelar-modal-empresa" class="btn-modal-cancelar" style="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;">
                Cancelar
              </button>
              <button type="submit" id="btn-guardar-empresa" class="btn-modal-guardar" style="background: #2563eb !important; color: #ffffff !important; border: none !important; padding: 10px 24px !important; border-radius: 10px !important; font-size: 13px !important; font-weight: 700 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; gap: 8px !important; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;">
                💾 Guardar Empresa
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateClasificacionCards();
  }

  static renderTableContent() {
    if (this.isLoading) {
      return `
        <div style="text-align: center; padding: 50px 20px; color: #64748b;">
          <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
          <p style="font-size: 14px; margin: 0;">Consultando directorio de empresas...</p>
        </div>
      `;
    }

    const filtrados = this.getTercerosFiltrados();

    if (filtrados.length === 0) {
      return `
        <div style="text-align: center; padding: 50px 20px; color: #64748b;">
          <div style="font-size: 32px; margin-bottom: 10px;">🏢</div>
          <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0 0 4px 0;">No se encontraron empresas</p>
          <p style="font-size: 13px; margin: 0 0 16px 0;">No hay registros que coincidan con el filtro o la búsqueda actual.</p>
          <button type="button" class="btn-nueva-empresa" id="btn-crear-primer-tercero" style="background: #2563eb !important; color: #ffffff !important; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer;">+ Registrar la primera empresa</button>
        </div>
      `;
    }

    return `
      <table class="empresas-data-table">
        <thead>
          <tr>
            <th>Empresa / Razón Social</th>
            <th>Documento / NIT</th>
            <th>Clasificación</th>
            <th>Contacto</th>
            <th>Ubicación</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtrados.map(t => {
            const esCliente = !!t.esCliente;
            const esProveedor = !!t.esProveedor;

            let badgeHtml = '';
            if (esCliente && esProveedor) {
              badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.2);">🔄 Cliente + Proveedor</span>`;
            } else if (esCliente) {
              badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: rgba(37, 99, 235, 0.1); color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.2);">👤 Cliente</span>`;
            } else if (esProveedor) {
              badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2);">🚚 Proveedor</span>`;
            } else {
              badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">Tercero</span>`;
            }

            return `
              <tr>
                <td>
                  <div style="font-weight: 600; color: #0f172a;">${t.razonSocial}</div>
                  <div style="font-size: 11px; color: #64748b;">${t.email || 'Sin correo registrado'}</div>
                </td>
                <td>
                  <span style="font-family: 'Fira Code', monospace; font-size: 12px; font-weight: 600; color: #0f172a; background: #f8fafc; padding: 2px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                    ${t.tipoDocumento || 'NIT'} ${t.numeroDocumento}
                  </span>
                </td>
                <td>${badgeHtml}</td>
                <td style="color: #64748b;">📞 ${t.telefono || '—'}</td>
                <td style="color: #64748b;">
                  <div>📍 ${t.ciudad || 'No especificada'}</div>
                  <div style="font-size: 11px;">${t.direccion || ''}</div>
                </td>
                <td style="text-align: right;">
                  <button type="button" class="btn-usar-en-factura" data-doc="${t.numeroDocumento}" data-nombre="${encodeURIComponent(t.razonSocial)}">
                    Facturar →
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  static getTercerosFiltrados() {
    let res = [...this.terceros];

    if (this.filtroTipo === 'cliente') {
      res = res.filter(t => t.esCliente && !t.esProveedor);
    } else if (this.filtroTipo === 'proveedor') {
      res = res.filter(t => t.esProveedor && !t.esCliente);
    } else if (this.filtroTipo === 'ambos') {
      res = res.filter(t => t.esCliente && t.esProveedor);
    }

    if (this.searchTerm.trim() !== '') {
      const q = this.searchTerm.toLowerCase();
      res = res.filter(t =>
        (t.razonSocial && t.razonSocial.toLowerCase().includes(q)) ||
        (t.numeroDocumento && t.numeroDocumento.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.ciudad && t.ciudad.toLowerCase().includes(q))
      );
    }

    return res;
  }

  static async cargarTerceros() {
    this.isLoading = true;
    const container = document.getElementById('empresas-table-container');
    if (container) container.innerHTML = this.renderTableContent();

    try {
      const res = await ApiClient.listTerceros();
      if (res.success && Array.isArray(res.data)) {
        this.terceros = res.data;
      }
    } catch (err) {
      console.error('Error cargando terceros:', err);
    } finally {
      this.isLoading = false;
      if (container) container.innerHTML = this.renderTableContent();
      this.bindTableEvents();
      // Actualizar conteo en el botón "Todos"
      const todosBtn = this.container.querySelector('[data-filtro="todos"]');
      if (todosBtn) todosBtn.textContent = `Todos (${this.terceros.length})`;
    }
  }

  static updateClasificacionCards() {
    const chkCliente = document.getElementById('chk-es-cliente');
    const chkProveedor = document.getElementById('chk-es-proveedor');
    const cardCliente = document.getElementById('card-es-cliente');
    const cardProveedor = document.getElementById('card-es-proveedor');

    const update = () => {
      if (cardCliente) {
        if (chkCliente?.checked) {
          cardCliente.style.borderColor = '#2563eb';
          cardCliente.style.background = '#eff6ff';
        } else {
          cardCliente.style.borderColor = '#cbd5e1';
          cardCliente.style.background = '#ffffff';
        }
      }
      if (cardProveedor) {
        if (chkProveedor?.checked) {
          cardProveedor.style.borderColor = '#2563eb';
          cardProveedor.style.background = '#eff6ff';
        } else {
          cardProveedor.style.borderColor = '#cbd5e1';
          cardProveedor.style.background = '#ffffff';
        }
      }
    };

    if (chkCliente) chkCliente.addEventListener('change', update);
    if (chkProveedor) chkProveedor.addEventListener('change', update);
    update();
  }

  static bindEvents() {
    // Botón refrescar
    document.getElementById('btn-refresh-empresas')?.addEventListener('click', () => this.cargarTerceros());

    // Botón nueva empresa
    document.getElementById('btn-nueva-empresa')?.addEventListener('click', () => this.abrirModal());

    // Botón crear primer tercero (estado vacío)
    document.getElementById('btn-crear-primer-tercero')?.addEventListener('click', () => this.abrirModal());

    // Filtros por píldora
    this.container.querySelectorAll('.empresa-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filtroTipo = btn.getAttribute('data-filtro');
        this.container.querySelectorAll('.empresa-filter-pill').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-filtro') === this.filtroTipo);
        });
        const container = document.getElementById('empresas-table-container');
        if (container) container.innerHTML = this.renderTableContent();
        this.bindTableEvents();
      });
    });

    // Búsqueda en vivo
    document.getElementById('input-buscar-empresa')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      const container = document.getElementById('empresas-table-container');
      if (container) container.innerHTML = this.renderTableContent();
      this.bindTableEvents();
    });

    // Modal eventos
    document.getElementById('btn-cerrar-modal-empresa')?.addEventListener('click', () => this.cerrarModal());
    document.getElementById('btn-cancelar-modal-empresa')?.addEventListener('click', () => this.cerrarModal());

    const backdrop = document.getElementById('modal-empresa-backdrop');
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.cerrarModal();
    });

    // Envío del formulario
    document.getElementById('form-registro-empresa')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.guardarEmpresa();
    });

    this.bindTableEvents();
  }

  static bindTableEvents() {
    this.container.querySelectorAll('.btn-usar-en-factura').forEach(btn => {
      btn.addEventListener('click', () => {
        const doc = btn.getAttribute('data-doc');
        const nombre = decodeURIComponent(btn.getAttribute('data-nombre'));
        state.setClienteSeleccionadoPreviamente({ doc, nombre });
        state.setView('facturacion');
      });
    });
  }

  static abrirModal() {
    const backdrop = document.getElementById('modal-empresa-backdrop');
    if (backdrop) backdrop.style.display = 'flex';
  }

  static cerrarModal() {
    const backdrop = document.getElementById('modal-empresa-backdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  static async guardarEmpresa() {
    const tipoDoc = document.getElementById('emp-tipo-doc')?.value || 'NIT';
    const numeroDoc = document.getElementById('emp-numero-doc')?.value.trim();
    const razonSocial = document.getElementById('emp-razon-social')?.value.trim();
    const email = document.getElementById('emp-email')?.value.trim();
    const telefono = document.getElementById('emp-telefono')?.value.trim();
    const direccion = document.getElementById('emp-direccion')?.value.trim();
    const ciudad = document.getElementById('emp-ciudad')?.value.trim();
    const esCliente = !!document.getElementById('chk-es-cliente')?.checked;
    const esProveedor = !!document.getElementById('chk-es-proveedor')?.checked;

    if (!numeroDoc || !razonSocial) {
      alert('Por favor completa el número de documento y la razón social.');
      return;
    }

    if (!esCliente && !esProveedor) {
      alert('Debes clasificar la empresa como Cliente, Proveedor o Ambos.');
      return;
    }

    const payload = {
      tipoDocumento: tipoDoc,
      numeroDocumento: numeroDoc,
      razonSocial,
      email: email || undefined,
      telefono: telefono || undefined,
      direccion: direccion || undefined,
      ciudad: ciudad || undefined,
      esCliente,
      esProveedor,
    };

    const btnSubmit = document.getElementById('btn-guardar-empresa');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Guardando...';
    }

    try {
      const res = await ApiClient.createTercero(payload);
      if (res.success) {
        this.cerrarModal();
        document.getElementById('form-registro-empresa')?.reset();
        this.updateClasificacionCards();
        await this.cargarTerceros();
      } else {
        alert(res.message || 'No se pudo guardar la empresa.');
      }
    } catch (err) {
      alert(`Error al registrar empresa: ${err.message}`);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '💾 Guardar Empresa';
      }
    }
  }
}
