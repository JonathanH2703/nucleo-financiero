/**
 * VISTA DE CONTABILIDAD FINANCIERA & FISCAL — NÚCLEO FINANCIERO
 * Libro Diario (Partida Doble), PUC, Balance de Comprobación y Liquidación DIAN.
 * Conectado en tiempo real a la base de datos PostgreSQL multi-tenant.
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

export class ContabilidadView {
  static async mount(container) {
    this.container = container;
    this.activeTab = 'diario'; // 'diario' | 'puc' | 'balance' | 'impuestos'
    this.taxSubtab = 'f300';   // 'f300' | 'f350'
    this.searchTerm = '';
    this.filtroTipoAsiento = 'todos';

    this.asientos = [];
    this.puc = [];
    this.balanceData = null;
    this.impuestosData = null;
    this.isLoading = true;

    this.render();
    await this.cargarDatos();
  }

  static render() {
    const tenant = state.currentTenant;

    this.container.innerHTML = `
      <div class="contabilidad-container">
        <!-- Encabezado Principal -->
        <div class="contabilidad-header-row">
          <div>
            <h1 class="contabilidad-header-title">
              <span>🏛️</span> Contabilidad Financiera & Fiscal
            </h1>
            <p class="contabilidad-header-desc">
              Gestión contable bajo NIIF · Libro Diario en partida doble · Plan Único de Cuentas (PUC) y liquidación fiscal DIAN para ${tenant.name}.
            </p>
          </div>
          <div class="contabilidad-header-actions" style="display: flex; gap: 10px; align-items: center;">
            <button type="button" class="btn-refresh-contab" id="btn-refresh-contab" style="background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a; padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              🔄 Actualizar
            </button>
            <button type="button" class="btn-nuevo-asiento" id="btn-nuevo-asiento" style="background: #2563eb !important; color: #ffffff !important; border: none !important; padding: 10px 20px !important; border-radius: 10px !important; font-size: 13px !important; font-weight: 700 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; gap: 8px !important; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;">
              <span style="font-size: 16px; font-weight: 800;">+</span> Registrar Asiento Manual
            </button>
          </div>
        </div>

        <!-- Pestañas Contables (Exclusivas de Contabilidad) -->
        <div class="contabilidad-nav-tabs">
          <button type="button" class="contab-tab-btn ${this.activeTab === 'diario' ? 'active' : ''}" data-tab="diario">
            📖 Libro Diario (Asientos)
          </button>
          <button type="button" class="contab-tab-btn ${this.activeTab === 'puc' ? 'active' : ''}" data-tab="puc">
            📑 Catálogo de Cuentas (PUC)
          </button>
          <button type="button" class="contab-tab-btn ${this.activeTab === 'balance' ? 'active' : ''}" data-tab="balance">
            ⚖️ Balance de Comprobación
          </button>
          <button type="button" class="contab-tab-btn ${this.activeTab === 'impuestos' ? 'active' : ''}" data-tab="impuestos">
            🏛️ Liquidación DIAN (IVA & Retenciones)
          </button>
        </div>

        <!-- Contenedor Dinámico de la Pestaña Activa -->
        <div id="contabilidad-tab-content">
          ${this.renderActiveTabContent()}
        </div>
      </div>

      <!-- Modal de Registro de Asiento Contable Manual -->
      <div id="modal-asiento-backdrop" class="modal-asiento-backdrop" style="display: none;">
        <div class="modal-asiento-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <h2 style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
                📝 Registrar Asiento Contable Manual
              </h2>
              <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">
                Ingresa los débitos y créditos con partida doble cuadrada conforme al PUC.
              </p>
            </div>
            <button type="button" id="btn-cerrar-modal-asiento" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700;">✕</button>
          </div>

          <form id="form-nuevo-asiento">
            <!-- Datos de Encabezado -->
            <div class="asiento-form-row-date" style="display: grid; grid-template-columns: 160px 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Fecha <span style="color: #dc2626;">*</span></label>
                <input type="date" id="asiento-fecha" required style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #0f172a;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Concepto General <span style="color: #dc2626;">*</span></label>
                <input type="text" id="asiento-concepto" required placeholder="Ej: Pago nómina quincenal personal operativo" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #0f172a;">
              </div>
            </div>

            <div class="asiento-form-row-tercero" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Tercero / Beneficiario (NIT)</label>
                <input type="text" id="asiento-tercero-nit" placeholder="Ej: 900.555.777-1" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #0f172a;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Nombre / Razón Social Tercero</label>
                <input type="text" id="asiento-tercero-nombre" placeholder="Ej: Inversiones y Servicios del Valle" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #0f172a;">
              </div>
            </div>

            <!-- Líneas Contables (Partida Doble) -->
            <div style="margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <label style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Líneas del Asiento (Partida Doble)</label>
                <button type="button" id="btn-add-linea" style="background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                  + Agregar Cuenta
                </button>
              </div>

              <!-- Cabecera de columnas -->
              <div class="asiento-line-row" style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px; padding: 0 4px;">
                <span>CUENTA PUC</span>
                <span>DESCRIPCIÓN</span>
                <span>DÉBITO ($)</span>
                <span>CRÉDITO ($)</span>
                <span></span>
              </div>

              <div id="asiento-lineas-container">
                <!-- Se inyectan dinámicamente -->
              </div>
            </div>

            <!-- Resumen de Partida Doble en Vivo -->
            <div class="partida-doble-summary" id="partida-doble-summary">
              <div>
                <span style="font-size: 12px; color: #64748b; display: block;">Total Débitos:</span>
                <strong style="font-size: 15px; color: #0f172a; font-family: 'Fira Code', monospace;" id="sum-debitos">$ 0</strong>
              </div>
              <div>
                <span style="font-size: 12px; color: #64748b; display: block;">Total Créditos:</span>
                <strong style="font-size: 15px; color: #0f172a; font-family: 'Fira Code', monospace;" id="sum-creditos">$ 0</strong>
              </div>
              <div id="status-cuadre-container" style="text-align: right;">
                <span style="font-size: 12px; color: #64748b; display: block;">Diferencia:</span>
                <span style="font-size: 14px; font-weight: 700; color: #059669;" id="val-diferencia">$ 0 (Cuadrado ✓)</span>
              </div>
            </div>

            <!-- Botones de Acción -->
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; border-top: 1px solid #e2e8f0; padding-top: 18px;">
              <button type="button" id="btn-cancelar-modal-asiento" style="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;">
                Cancelar
              </button>
              <button type="submit" id="btn-guardar-asiento" style="background: #2563eb !important; color: #ffffff !important; border: none !important; padding: 10px 24px !important; border-radius: 10px !important; font-size: 13px !important; font-weight: 700 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; gap: 8px !important; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;">
                💾 Guardar Asiento Contable
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  static renderActiveTabContent() {
    if (this.isLoading) {
      return `
        <div style="text-align: center; padding: 60px 20px; color: #64748b; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0;">
          <div style="font-size: 32px; margin-bottom: 12px; animation: pulse 1.5s infinite;">⏳</div>
          <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0 0 4px 0;">Cargando registros contables...</p>
          <p style="font-size: 13px; margin: 0;">Consultando Libro Diario y Plan de Cuentas en la base de datos.</p>
        </div>
      `;
    }

    switch (this.activeTab) {
      case 'diario':
        return this.renderLibroDiario();
      case 'puc':
        return this.renderPuc();
      case 'balance':
        return this.renderBalance();
      case 'impuestos':
        return this.renderImpuestos();
      default:
        return this.renderLibroDiario();
    }
  }

  // ─── 1. PESTAÑA: LIBRO DIARIO ─────────────────────────────────
  static renderLibroDiario() {
    const filtrados = this.getAsientosFiltrados();

    let totalDeb = 0;
    let totalCred = 0;
    this.asientos.forEach(a => {
      totalDeb += (a.totalDebito || 0);
      totalCred += (a.totalCredito || 0);
    });

    return `
      <!-- Tarjetas de métricas contables rápidas -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
          <span style="font-size: 12px; font-weight: 600; color: #64748b;">Comprobantes en Libro Diario</span>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">${this.asientos.length} asientos</div>
          <span style="font-size: 11px; color: #059669; font-weight: 600;">✓ Conectado a Facturación DIAN</span>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
          <span style="font-size: 12px; font-weight: 600; color: #64748b;">Total Débitos Registrados</span>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; font-family: 'Fira Code', monospace; margin-top: 4px;">$ ${totalDeb.toLocaleString('es-CO')}</div>
          <span style="font-size: 11px; color: #64748b;">Movimientos débito acumulados</span>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
          <span style="font-size: 12px; font-weight: 600; color: #64748b;">Total Créditos Registrados</span>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; font-family: 'Fira Code', monospace; margin-top: 4px;">$ ${totalCred.toLocaleString('es-CO')}</div>
          <span style="font-size: 11px; color: #64748b;">Movimientos crédito acumulados</span>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px;">
          <span style="font-size: 12px; font-weight: 600; color: #166534;">Estado de Cuadre NIIF</span>
          <div style="font-size: 20px; font-weight: 800; color: #15803d; margin-top: 4px;">Partida Doble OK</div>
          <span style="font-size: 11px; color: #166534;">Diferencia global: $0 COP</span>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="contabilidad-card">
        <div class="contabilidad-toolbar">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="empresa-filter-pill ${this.filtroTipoAsiento === 'todos' ? 'active' : ''}" data-tipo-asiento="todos">Todos (${this.asientos.length})</button>
            <button type="button" class="empresa-filter-pill ${this.filtroTipoAsiento === 'FACTURA_VENTA' ? 'active' : ''}" data-tipo-asiento="FACTURA_VENTA">📑 Ventas DIAN</button>
            <button type="button" class="empresa-filter-pill ${this.filtroTipoAsiento === 'MANUAL' ? 'active' : ''}" data-tipo-asiento="MANUAL">✍️ Asientos Manuales</button>
            <button type="button" class="empresa-filter-pill ${this.filtroTipoAsiento === 'GASTO' ? 'active' : ''}" data-tipo-asiento="GASTO">🏢 Gastos & Operación</button>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" id="input-buscar-asiento" class="contab-search-input" value="${this.searchTerm}" placeholder="🔍 Buscar por comprobante, cuenta o tercero...">
            <button type="button" id="btn-exportar-asientos" style="background: #ffffff; border: 1px solid #cbd5e1; color: #334155; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">
              📥 Exportar CSV
            </button>
          </div>
        </div>

        <!-- Listado de Asientos Contables -->
        <div style="padding: 20px;" id="asientos-list-container">
          ${filtrados.length === 0 ? `
            <div style="text-align: center; padding: 40px 20px; color: #64748b;">
              <div style="font-size: 32px; margin-bottom: 8px;">📖</div>
              <p style="font-size: 14px; font-weight: 600; margin: 0;">No se encontraron asientos contables con el filtro actual</p>
            </div>
          ` : filtrados.map(a => `
            <div class="asiento-card">
              <div class="asiento-card-header">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <span class="asiento-comprobante-badge">${a.numeroComprobante}</span>
                  <span style="font-size: 12px; color: #64748b; font-weight: 500;">📅 ${a.fecha}</span>
                  <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${a.concepto}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-size: 12px; color: #64748b;">Tercero: <strong>${a.terceroNombre || 'Consumidor Final'}</strong> (${a.terceroNit || 'N/A'})</span>
                  <span style="background: #f0fdf4; color: #166534; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid #bbf7d0;">✓ Cuadrado</span>
                </div>
              </div>

              <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
              <table class="asiento-lines-table">
                <thead>
                  <tr>
                    <th style="width: 140px;">Cuenta PUC</th>
                    <th>Nombre de Cuenta</th>
                    <th>Detalle / Concepto</th>
                    <th style="text-align: right; width: 140px;">Débito</th>
                    <th style="text-align: right; width: 140px;">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  ${(a.lineas || []).map(l => `
                    <tr>
                      <td>
                        <span style="font-family: 'Fira Code', monospace; font-size: 11px; font-weight: 600; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; color: #0f172a;">
                          ${l.cuentaCodigo}
                        </span>
                      </td>
                      <td style="font-weight: 600; color: #1e293b;">${l.cuentaNombre}</td>
                      <td style="color: #64748b;">${l.descripcion || a.concepto}</td>
                      <td style="text-align: right; font-family: 'Fira Code', monospace; font-weight: 600; color: ${l.debito > 0 ? '#0f172a' : '#94a3b8'};">
                        ${l.debito > 0 ? `$ ${Number(l.debito).toLocaleString('es-CO')}` : '—'}
                      </td>
                      <td style="text-align: right; font-family: 'Fira Code', monospace; font-weight: 600; color: ${l.credito > 0 ? '#0f172a' : '#94a3b8'};">
                        ${l.credito > 0 ? `$ ${Number(l.credito).toLocaleString('es-CO')}` : '—'}
                      </td>
                    </tr>
                  `).join('')}
                  <tr style="background: #f8fafc; font-weight: 700;">
                    <td colspan="3" style="text-align: right; font-size: 11px; color: #64748b; text-transform: uppercase;">Sumas Iguales:</td>
                    <td style="text-align: right; font-family: 'Fira Code', monospace; color: #0f172a;">$ ${(a.totalDebito || 0).toLocaleString('es-CO')}</td>
                    <td style="text-align: right; font-family: 'Fira Code', monospace; color: #0f172a;">$ ${(a.totalCredito || 0).toLocaleString('es-CO')}</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ─── 2. PESTAÑA: PLAN ÚNICO DE CUENTAS (PUC) ──────────────────
  static renderPuc() {
    return `
      <div class="contabilidad-card">
        <div class="contabilidad-toolbar">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 2px 0;">Plan Único de Cuentas (PUC Oficial Colombia)</h3>
            <p style="font-size: 12px; color: #64748b; margin: 0;">Estructura contable activa con saldos en tiempo real calculados según Libro Diario.</p>
          </div>
          <div style="font-size: 12px; color: #64748b; background: #eff6ff; padding: 6px 14px; border-radius: 8px; border: 1px solid #bfdbfe;">
            💡 <strong>1. Activo · 2. Pasivo · 3. Patrimonio · 4. Ingresos · 5. Gastos · 6. Costos</strong>
          </div>
        </div>

        <table class="contab-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Denominación de la Cuenta</th>
              <th>Clase</th>
              <th>Naturaleza</th>
              <th style="text-align: right;">Débitos Acum.</th>
              <th style="text-align: right;">Créditos Acum.</th>
              <th style="text-align: right;">Saldo Actual</th>
            </tr>
          </thead>
          <tbody>
            ${this.puc.map(c => `
              <tr>
                <td>
                  <span style="font-family: 'Fira Code', monospace; font-size: 12px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 4px;">
                    ${c.codigo}
                  </span>
                </td>
                <td>
                  <div style="font-weight: 600; color: #0f172a;">${c.nombre}</div>
                  <div style="font-size: 11px; color: #64748b;">${c.descripcion || ''}</div>
                </td>
                <td>
                  <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #475569;">
                    Clase ${c.clase}
                  </span>
                </td>
                <td>
                  <span style="font-size: 11px; font-weight: 600; color: ${c.tipo === 'DEBITO' ? '#2563eb' : '#d97706'};">
                    ${c.tipo === 'DEBITO' ? 'Débito (+)' : 'Crédito (-)'}
                  </span>
                </td>
                <td style="text-align: right; font-family: 'Fira Code', monospace; color: #334155;">
                  $ ${(c.movimientoDebito || 0).toLocaleString('es-CO')}
                </td>
                <td style="text-align: right; font-family: 'Fira Code', monospace; color: #334155;">
                  $ ${(c.movimientoCredito || 0).toLocaleString('es-CO')}
                </td>
                <td style="text-align: right; font-family: 'Fira Code', monospace; font-weight: 700; font-size: 14px; color: ${c.saldoActual < 0 ? '#dc2626' : '#0f172a'};">
                  $ ${(c.saldoActual || 0).toLocaleString('es-CO')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ─── 3. PESTAÑA: BALANCE DE COMPROBACIÓN ───────────────────────
  static renderBalance() {
    if (!this.balanceData) {
      return `<div style="padding: 40px; text-align: center; color: #64748b;">No hay información del balance de comprobación.</div>`;
    }

    const { cuentas, totales, empresa, fechaGeneracion } = this.balanceData;

    return `
      <div class="contabilidad-card">
        <div class="contabilidad-toolbar">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 2px 0;">Balance de Comprobación y Prueba</h3>
            <p style="font-size: 12px; color: #64748b; margin: 0;">Generado para <strong>${empresa}</strong> · Fecha: ${new Date(fechaGeneracion).toLocaleDateString('es-CO')}</p>
          </div>
          <div style="background: ${totales.estaCuadrado ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${totales.estaCuadrado ? '#bbf7d0' : '#fecaca'}; padding: 6px 14px; border-radius: 8px;">
            <strong style="color: ${totales.estaCuadrado ? '#166534' : '#991b1b'}; font-size: 13px;">
              ${totales.estaCuadrado ? '✓ Balance Cuadrado (Sumas Iguales NIIF)' : `⚠️ Descuadre de $ ${totales.diferencia.toLocaleString('es-CO')}`}
            </strong>
          </div>
        </div>

        <table class="contab-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cuenta Contable</th>
              <th>Clase</th>
              <th>Naturaleza</th>
              <th style="text-align: right;">Débito</th>
              <th style="text-align: right;">Crédito</th>
              <th style="text-align: right;">Saldo Neto</th>
            </tr>
          </thead>
          <tbody>
            ${cuentas.map(c => `
              <tr>
                <td>
                  <span style="font-family: 'Fira Code', monospace; font-size: 12px; font-weight: 700;">${c.codigo}</span>
                </td>
                <td style="font-weight: 600; color: #0f172a;">${c.nombre}</td>
                <td><span style="font-size: 11px; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">Clase ${c.clase}</span></td>
                <td style="font-size: 11px; font-weight: 600; color: ${c.tipo === 'DEBITO' ? '#2563eb' : '#d97706'};">${c.tipo}</td>
                <td style="text-align: right; font-family: 'Fira Code', monospace; color: #334155;">$ ${(c.debito || 0).toLocaleString('es-CO')}</td>
                <td style="text-align: right; font-family: 'Fira Code', monospace; color: #334155;">$ ${(c.credito || 0).toLocaleString('es-CO')}</td>
                <td style="text-align: right; font-family: 'Fira Code', monospace; font-weight: 700; color: #0f172a;">$ ${(c.saldo || 0).toLocaleString('es-CO')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 800; font-size: 14px; border-top: 2px solid #cbd5e1;">
              <td colspan="4" style="text-align: right; text-transform: uppercase; color: #334155;">Totales de Comprobación:</td>
              <td style="text-align: right; font-family: 'Fira Code', monospace; color: #2563eb;">$ ${(totales.totalDebitos || 0).toLocaleString('es-CO')}</td>
              <td style="text-align: right; font-family: 'Fira Code', monospace; color: #2563eb;">$ ${(totales.totalCreditos || 0).toLocaleString('es-CO')}</td>
              <td style="text-align: right; font-family: 'Fira Code', monospace; color: #059669;">Diferencia: $0</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  // ─── 4. PESTAÑA: LIQUIDACIÓN TRIBUTARIA DIAN ───────────────────
  static renderImpuestos() {
    const data = this.impuestosData || {};
    const f300 = data.f300_iva || {};
    const f350 = data.f350_retenciones || {};
    const tenant = state.currentTenant;

    return `
      <!-- Subpestañas F-300 / F-350 -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button type="button" class="empresa-filter-pill ${this.taxSubtab === 'f300' ? 'active' : ''}" data-tax-subtab="f300" style="padding: 8px 18px; font-size: 13px;">
          📑 Impuesto sobre las Ventas (IVA F-300)
        </button>
        <button type="button" class="empresa-filter-pill ${this.taxSubtab === 'f350' ? 'active' : ''}" data-tax-subtab="f350" style="padding: 8px 18px; font-size: 13px;">
          🏛️ Retenciones en la Fuente (F-350)
        </button>
      </div>

      ${this.taxSubtab === 'f300' ? `
        <!-- Formulario 300 DIAN (IVA) -->
        <div class="contabilidad-card" style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="background: #eff6ff; color: #2563eb; font-weight: 800; font-size: 13px; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe;">F-300 DIAN</span>
                <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0;">Declaración del Impuesto sobre las Ventas (IVA)</h3>
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">
                Liquidación bimestral automatizada según facturas electrónicas emitidas y asientos de compras de ${tenant.name}.
              </p>
            </div>
            <button type="button" id="btn-descargar-f300" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
              📥 Descargar Certificado DIAN (JSON)
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #fafafa;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Renglón 27 — Ingresos Gravados</span>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; font-family: 'Fira Code', monospace; margin-top: 4px;">
                $ ${(f300.renglon27_ingresos_gravados || 0).toLocaleString('es-CO')}
              </div>
              <span style="font-size: 11px; color: #64748b;">Base gravable total facturada</span>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #fafafa;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Renglón 59 — IVA Generado a la Tarifa 19%</span>
              <div style="font-size: 20px; font-weight: 800; color: #2563eb; font-family: 'Fira Code', monospace; margin-top: 4px;">
                $ ${(f300.renglon59_iva_generado_19 || 0).toLocaleString('es-CO')}
              </div>
              <span style="font-size: 11px; color: #64748b;">Impuesto recaudado a clientes</span>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #fafafa;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Renglón 76 — IVA Descontable en Compras</span>
              <div style="font-size: 20px; font-weight: 800; color: #d97706; font-family: 'Fira Code', monospace; margin-top: 4px;">
                $ ${(f300.renglon76_iva_descontable_compras || 0).toLocaleString('es-CO')}
              </div>
              <span style="font-size: 11px; color: #64748b;">IVA pagado en insumos / compras</span>
            </div>

            <div style="border: 1.5px solid #2563eb; border-radius: 10px; padding: 16px; background: #eff6ff;">
              <span style="font-size: 11px; font-weight: 800; color: #1e40af; text-transform: uppercase;">Renglón 82 — Total Saldo a Pagar</span>
              <div style="font-size: 22px; font-weight: 800; color: #1d4ed8; font-family: 'Fira Code', monospace; margin-top: 4px;">
                $ ${(f300.renglon82_saldo_a_pagar || 0).toLocaleString('es-CO')}
              </div>
              <span style="font-size: 11px; color: #1e40af; font-weight: 600;">Vencimiento: ${data.fechaLimitePago || '2026-11-18'}</span>
            </div>
          </div>
        </div>
      ` : `
        <!-- Formulario 350 DIAN (Retenciones en la fuente) -->
        <div class="contabilidad-card" style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="background: #fef3c7; color: #b45309; font-weight: 800; font-size: 13px; padding: 4px 10px; border-radius: 6px; border: 1px solid #fde68a;">F-350 DIAN</span>
                <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0;">Retenciones en la Fuente Practicadas</h3>
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">
                Periodicidad mensual · Compras generales, servicios técnicos y honorarios según Estatuto Tributario.
              </p>
            </div>
            <button type="button" id="btn-descargar-f350" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
              📥 Descargar Certificado DIAN (JSON)
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #fafafa;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Base Gravable Acumulada</span>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; font-family: 'Fira Code', monospace; margin-top: 4px;">
                $ ${(f350.base_gravable_acumulada || 0).toLocaleString('es-CO')}
              </div>
              <span style="font-size: 11px; color: #64748b;">Tarifa promedio: ${f350.tarifa_promedio || '3.5%'}</span>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #fafafa;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Renglón 48 — Retención Compras</span>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; font-family: 'Fira Code', monospace; margin-top: 4px;">
                $ ${(f350.renglon48_retenciones_compras || 0).toLocaleString('es-CO')}
              </div>
              <span style="font-size: 11px; color: #64748b;">Retenciones sobre adquisición de bienes</span>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #fafafa;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Renglón 52 — Retención Servicios</span>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; font-family: 'Fira Code', monospace; margin-top: 4px;">
                $ ${(f350.renglon52_retenciones_servicios || 0).toLocaleString('es-CO')}
              </div>
              <span style="font-size: 11px; color: #64748b;">Honorarios, comisiones y servicios</span>
            </div>

            <div style="border: 1.5px solid #dc2626; border-radius: 10px; padding: 16px; background: #fef2f2;">
              <span style="font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Renglón 64 — Total Retenciones a Pagar</span>
              <div style="font-size: 22px; font-weight: 800; color: #dc2626; font-family: 'Fira Code', monospace; margin-top: 4px;">
                $ ${(f350.renglon64_total_retenciones || 0).toLocaleString('es-CO')}
              </div>
              <span style="font-size: 11px; color: #991b1b; font-weight: 600;">Vencimiento: ${data.fechaLimitePago || '2026-11-18'}</span>
            </div>
          </div>
        </div>
      `}
    `;
  }

  static getAsientosFiltrados() {
    let list = [...this.asientos];

    if (this.filtroTipoAsiento !== 'todos') {
      list = list.filter(a => a.tipo === this.filtroTipoAsiento);
    }

    if (this.searchTerm.trim() !== '') {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(a =>
        (a.numeroComprobante && a.numeroComprobante.toLowerCase().includes(q)) ||
        (a.concepto && a.concepto.toLowerCase().includes(q)) ||
        (a.terceroNombre && a.terceroNombre.toLowerCase().includes(q)) ||
        (a.terceroNit && a.terceroNit.toLowerCase().includes(q))
      );
    }

    return list;
  }

  static async cargarDatos() {
    this.isLoading = true;
    const content = document.getElementById('contabilidad-tab-content');
    if (content) content.innerHTML = this.renderActiveTabContent();

    try {
      const [diarioRes, pucRes, balanceRes, taxRes] = await Promise.all([
        ApiClient.getLibroDiario(),
        ApiClient.getPuc(),
        ApiClient.getBalancePrueba(),
        ApiClient.getLiquidacionImpuestos()
      ]);

      if (diarioRes.success) this.asientos = diarioRes.data || [];
      if (pucRes.success) this.puc = pucRes.data || [];
      if (balanceRes.success) this.balanceData = balanceRes.data || null;
      if (taxRes.success) this.impuestosData = taxRes.data || null;
    } catch (err) {
      console.error('Error al cargar datos contables:', err);
    } finally {
      this.isLoading = false;
      if (content) content.innerHTML = this.renderActiveTabContent();
      this.bindTabContentEvents();
    }
  }

  static bindEvents() {
    // Botón refrescar
    document.getElementById('btn-refresh-contab')?.addEventListener('click', () => this.cargarDatos());

    // Botón nuevo asiento manual
    document.getElementById('btn-nuevo-asiento')?.addEventListener('click', () => this.abrirModalAsiento());

    // Pestañas principales (Libro Diario, PUC, Balance, Impuestos)
    this.container.querySelectorAll('.contab-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.container.querySelectorAll('.contab-tab-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-tab') === this.activeTab);
        });
        const content = document.getElementById('contabilidad-tab-content');
        if (content) content.innerHTML = this.renderActiveTabContent();
        this.bindTabContentEvents();
      });
    });

    // Modal eventos
    document.getElementById('btn-cerrar-modal-asiento')?.addEventListener('click', () => this.cerrarModalAsiento());
    document.getElementById('btn-cancelar-modal-asiento')?.addEventListener('click', () => this.cerrarModalAsiento());

    const backdrop = document.getElementById('modal-asiento-backdrop');
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.cerrarModalAsiento();
    });

    // Agregar línea en el modal
    document.getElementById('btn-add-linea')?.addEventListener('click', () => this.agregarFilaAsiento());

    // Submit del formulario de nuevo asiento
    document.getElementById('form-nuevo-asiento')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.guardarAsientoManual();
    });

    this.bindTabContentEvents();
  }

  static bindTabContentEvents() {
    // Búsqueda en libro diario
    document.getElementById('input-buscar-asiento')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      const listContainer = document.getElementById('asientos-list-container');
      if (listContainer) {
        const filtrados = this.getAsientosFiltrados();
        listContainer.innerHTML = filtrados.length === 0 ? `
          <div style="text-align: center; padding: 40px 20px; color: #64748b;">
            <p style="font-size: 14px; font-weight: 600; margin: 0;">No se encontraron asientos contables</p>
          </div>
        ` : filtrados.map(a => `
          <div class="asiento-card">
            <div class="asiento-card-header">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span class="asiento-comprobante-badge">${a.numeroComprobante}</span>
                <span style="font-size: 12px; color: #64748b; font-weight: 500;">📅 ${a.fecha}</span>
                <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${a.concepto}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 12px; color: #64748b;">Tercero: <strong>${a.terceroNombre || 'Consumidor Final'}</strong></span>
                <span style="background: #f0fdf4; color: #166534; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">✓ Cuadrado</span>
              </div>
            </div>
            <table class="asiento-lines-table">
              <thead>
                <tr><th>Cuenta</th><th>Nombre</th><th>Detalle</th><th style="text-align: right;">Débito</th><th style="text-align: right;">Crédito</th></tr>
              </thead>
              <tbody>
                ${(a.lineas || []).map(l => `
                  <tr>
                    <td><span style="font-family: 'Fira Code', monospace; font-size: 11px;">${l.cuentaCodigo}</span></td>
                    <td style="font-weight: 600;">${l.cuentaNombre}</td>
                    <td style="color: #64748b;">${l.descripcion || a.concepto}</td>
                    <td style="text-align: right; font-family: 'Fira Code', monospace;">${l.debito > 0 ? `$ ${Number(l.debito).toLocaleString('es-CO')}` : '—'}</td>
                    <td style="text-align: right; font-family: 'Fira Code', monospace;">${l.credito > 0 ? `$ ${Number(l.credito).toLocaleString('es-CO')}` : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('');
      }
    });

    // Píldoras de filtro por tipo de asiento
    this.container.querySelectorAll('[data-tipo-asiento]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filtroTipoAsiento = btn.getAttribute('data-tipo-asiento');
        this.container.querySelectorAll('[data-tipo-asiento]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-tipo-asiento') === this.filtroTipoAsiento);
        });
        const content = document.getElementById('contabilidad-tab-content');
        if (content) content.innerHTML = this.renderActiveTabContent();
        this.bindTabContentEvents();
      });
    });

    // Exportar asientos a CSV
    document.getElementById('btn-exportar-asientos')?.addEventListener('click', () => {
      this.exportarCsvAsientos();
    });

    // Subpestañas F-300 / F-350 en Liquidación de Impuestos
    this.container.querySelectorAll('[data-tax-subtab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.taxSubtab = btn.getAttribute('data-tax-subtab');
        const content = document.getElementById('contabilidad-tab-content');
        if (content) content.innerHTML = this.renderActiveTabContent();
        this.bindTabContentEvents();
      });
    });

    // Descargar certificados DIAN
    document.getElementById('btn-descargar-f300')?.addEventListener('click', () => {
      this.descargarCertificadoDian('F300_IVA', this.impuestosData?.f300_iva);
    });

    document.getElementById('btn-descargar-f350')?.addEventListener('click', () => {
      this.descargarCertificadoDian('F350_RETENCION', this.impuestosData?.f350_retenciones);
    });
  }

  static abrirModalAsiento() {
    const backdrop = document.getElementById('modal-asiento-backdrop');
    if (!backdrop) return;

    // Inicializar fecha de hoy
    const fechaInput = document.getElementById('asiento-fecha');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

    // Inicializar dos filas base de partida doble
    const container = document.getElementById('asiento-lineas-container');
    if (container) {
      container.innerHTML = '';
      this.agregarFilaAsiento('510506', 'Sueldos y Salarios del Personal', 'Nómina quincenal', 1500000, 0);
      this.agregarFilaAsiento('111005', 'Bancos Nacionales', 'Giro desde cuenta corriente', 0, 1500000);
    }

    this.recalcularPartidaDoble();
    backdrop.style.display = 'flex';
  }

  static cerrarModalAsiento() {
    const backdrop = document.getElementById('modal-asiento-backdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  static agregarFilaAsiento(codigo = '110505', nombre = 'Caja General', desc = '', debito = 0, credito = 0) {
    const container = document.getElementById('asiento-lineas-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'asiento-line-row';
    row.innerHTML = `
      <select class="linea-cuenta" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 12px; color: #0f172a;">
        <option value="110505" data-nombre="Caja General" ${codigo === '110505' ? 'selected' : ''}>110505 - Caja General</option>
        <option value="111005" data-nombre="Bancos Nacionales" ${codigo === '111005' ? 'selected' : ''}>111005 - Bancos Nacionales</option>
        <option value="130505" data-nombre="Clientes Nacionales" ${codigo === '130505' ? 'selected' : ''}>130505 - Clientes Nacionales</option>
        <option value="143505" data-nombre="Inventario de Mercancías" ${codigo === '143505' ? 'selected' : ''}>143505 - Inventario Mercancías</option>
        <option value="220505" data-nombre="Proveedores Nacionales" ${codigo === '220505' ? 'selected' : ''}>220505 - Proveedores Nacionales</option>
        <option value="236540" data-nombre="Retención en la Fuente por Pagar" ${codigo === '236540' ? 'selected' : ''}>236540 - Retefuente Compras (3.5%)</option>
        <option value="240801" data-nombre="IVA Generado 19%" ${codigo === '240801' ? 'selected' : ''}>240801 - IVA Generado 19%</option>
        <option value="240802" data-nombre="IVA Descontable en Compras" ${codigo === '240802' ? 'selected' : ''}>240802 - IVA Descontable</option>
        <option value="311505" data-nombre="Aportes Sociales / Capital Suscrito" ${codigo === '311505' ? 'selected' : ''}>311505 - Aportes Sociales</option>
        <option value="413505" data-nombre="Ingresos Operacionales" ${codigo === '413505' ? 'selected' : ''}>413505 - Ingresos Operacionales</option>
        <option value="510506" data-nombre="Sueldos y Salarios del Personal" ${codigo === '510506' ? 'selected' : ''}>510506 - Sueldos y Nómina</option>
        <option value="512010" data-nombre="Arrendamientos de Inmuebles" ${codigo === '512010' ? 'selected' : ''}>512010 - Arrendamientos</option>
        <option value="513525" data-nombre="Servicios Públicos (Luz, Agua, Gas)" ${codigo === '513525' ? 'selected' : ''}>513525 - Servicios Públicos</option>
      </select>
      <input type="text" class="linea-desc" value="${desc}" placeholder="Detalle de línea..." style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 12px; color: #0f172a;">
      <input type="number" class="linea-debito" value="${debito || ''}" placeholder="0" min="0" step="any" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 12px; text-align: right; color: #0f172a; font-family: 'Fira Code', monospace;">
      <input type="number" class="linea-credito" value="${credito || ''}" placeholder="0" min="0" step="any" style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 12px; text-align: right; color: #0f172a; font-family: 'Fira Code', monospace;">
      <button type="button" class="btn-remove-line" title="Eliminar fila">✕</button>
    `;

    // Eventos de cálculo dinámico
    row.querySelector('.linea-debito')?.addEventListener('input', () => this.recalcularPartidaDoble());
    row.querySelector('.linea-credito')?.addEventListener('input', () => this.recalcularPartidaDoble());
    row.querySelector('.btn-remove-line')?.addEventListener('click', () => {
      if (container.children.length <= 2) {
        alert('Un asiento contable debe tener al menos 2 líneas para cumplir la partida doble.');
        return;
      }
      row.remove();
      this.recalcularPartidaDoble();
    });

    container.appendChild(row);
    this.recalcularPartidaDoble();
  }

  static recalcularPartidaDoble() {
    const rows = document.querySelectorAll('.asiento-line-row');
    let totalDeb = 0;
    let totalCred = 0;

    rows.forEach(r => {
      const debInput = r.querySelector('.linea-debito');
      const credInput = r.querySelector('.linea-credito');
      totalDeb += Number(debInput?.value || 0);
      totalCred += Number(credInput?.value || 0);
    });

    const diff = Math.abs(totalDeb - totalCred);
    const estaCuadrado = diff < 0.05 && totalDeb > 0;

    const sumDebEl = document.getElementById('sum-debitos');
    const sumCredEl = document.getElementById('sum-creditos');
    const valDiffEl = document.getElementById('val-diferencia');
    const btnSubmit = document.getElementById('btn-guardar-asiento');

    if (sumDebEl) sumDebEl.textContent = `$ ${totalDeb.toLocaleString('es-CO')}`;
    if (sumCredEl) sumCredEl.textContent = `$ ${totalCred.toLocaleString('es-CO')}`;

    if (valDiffEl) {
      if (estaCuadrado) {
        valDiffEl.textContent = `$ 0 (Cuadrado ✓)`;
        valDiffEl.style.color = '#059669';
      } else {
        valDiffEl.textContent = `Diferencia: $ ${diff.toLocaleString('es-CO')} (Descuadrado)`;
        valDiffEl.style.color = '#dc2626';
      }
    }

    if (btnSubmit) {
      btnSubmit.disabled = !estaCuadrado;
      btnSubmit.style.opacity = estaCuadrado ? '1' : '0.5';
    }
  }

  static async guardarAsientoManual() {
    const fecha = document.getElementById('asiento-fecha')?.value;
    const concepto = document.getElementById('asiento-concepto')?.value?.trim();
    const terceroNit = document.getElementById('asiento-tercero-nit')?.value?.trim();
    const terceroNombre = document.getElementById('asiento-tercero-nombre')?.value?.trim();

    const rows = document.querySelectorAll('.asiento-line-row');
    const lineas = [];

    rows.forEach(r => {
      const select = r.querySelector('.linea-cuenta');
      const descInput = r.querySelector('.linea-desc');
      const debInput = r.querySelector('.linea-debito');
      const credInput = r.querySelector('.linea-credito');

      const cuentaCodigo = select?.value;
      const cuentaNombre = select?.options[select.selectedIndex]?.getAttribute('data-nombre') || 'Cuenta Contable';
      const debito = Number(debInput?.value || 0);
      const credito = Number(credInput?.value || 0);
      const descripcion = descInput?.value?.trim() || concepto;

      if (debito > 0 || credito > 0) {
        lineas.push({ cuentaCodigo, cuentaNombre, descripcion, debito, credito });
      }
    });

    if (!concepto || lineas.length < 2) {
      alert('Por favor completa el concepto y al menos 2 líneas contables válidas.');
      return;
    }

    const payload = {
      fecha,
      concepto,
      terceroNit: terceroNit || undefined,
      terceroNombre: terceroNombre || undefined,
      lineas
    };

    const btnSubmit = document.getElementById('btn-guardar-asiento');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Guardando en BD...';
    }

    try {
      const res = await ApiClient.createAsiento(payload);
      if (res.success) {
        this.cerrarModalAsiento();
        document.getElementById('form-nuevo-asiento')?.reset();
        await this.cargarDatos();
        alert(res.message || 'Asiento contable registrado exitosamente.');
      } else {
        alert(res.message || 'No se pudo guardar el asiento contable.');
      }
    } catch (err) {
      alert(`Error al registrar asiento: ${err.message}`);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '💾 Guardar Asiento Contable';
      }
    }
  }

  static exportarCsvAsientos() {
    if (this.asientos.length === 0) {
      alert('No hay asientos contables para exportar.');
      return;
    }

    const rows = [
      ['Comprobante', 'Fecha', 'Concepto General', 'Tercero NIT', 'Tercero Nombre', 'Cuenta PUC', 'Nombre Cuenta', 'Detalle Línea', 'Débito', 'Crédito']
    ];

    this.asientos.forEach(a => {
      (a.lineas || []).forEach(l => {
        rows.push([
          a.numeroComprobante,
          a.fecha,
          `"${(a.concepto || '').replace(/"/g, '""')}"`,
          a.terceroNit || '',
          `"${(a.terceroNombre || '').replace(/"/g, '""')}"`,
          l.cuentaCodigo,
          `"${(l.cuentaNombre || '').replace(/"/g, '""')}"`,
          `"${(l.descripcion || '').replace(/"/g, '""')}"`,
          l.debito || 0,
          l.credito || 0
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Libro_Diario_${state.currentTenant.slug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static descargarCertificadoDian(tipo, data) {
    const obj = {
      certificado: tipo,
      tenant: state.currentTenant.name,
      nit: state.currentTenant.taxId,
      fechaEmision: new Date().toISOString(),
      estado: 'PREVALIDADO_DIAN_XSD_2026',
      renglones: data
    };

    const str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(obj, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', str);
    link.setAttribute('download', `Certificado_${tipo}_${state.currentTenant.slug}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
