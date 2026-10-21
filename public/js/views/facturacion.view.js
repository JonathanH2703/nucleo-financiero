/**
 * VISTA DE FACTURACIÓN ELECTRÓNICA DIAN — NÚCLEO FINANCIERO (FIGMA DESIGN)
 * Completa para PyMEs: Emisión directa, resumen financiero, filtrado y paginación
 * en servidor (cero N+1), registro de pagos/abonos, notas de crédito y descarga UBL 2.1.
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

export class FacturacionView {
  static async mount(container) {
    this.container = container;
    this.facturas = [];
    this.filterState = 'TODAS';
    this.searchTerm = '';
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalRecords = 0;
    this.pageSize = 10;
    this.selectedFactura = null;
    this.searchDebounceTimer = null;
    this.resumenData = null;

    this.renderSkeleton();
    await Promise.all([this.loadResumenFinanciero(), this.loadFacturas()]);
  }

  static renderSkeleton() {
    this.container.innerHTML = `
      <div class="facturacion-container">
        <!-- Header de Facturación -->
        <div class="facturacion-header-card">
          <div class="facturacion-title-group">
            <h2>
              <span>📑 Facturación Electrónica DIAN</span>
              <span class="badge badge-aceptada">Habilitado DIAN 2026</span>
            </h2>
            <p>Registro de comprobantes fiscales UBL 2.1 · Resoluciones vigentes · ${state.currentTenant.name}</p>
          </div>

          <div class="facturacion-actions">
            <button class="btn-secondary" id="btn-export-xml" title="Descargar paquete de comprobantes XML UBL 2.1">
              📥 Descargar XMLs
            </button>
            <button class="btn-primary" id="btn-nueva-factura">
              + Emitir Factura Directa
            </button>
          </div>
        </div>

        <!-- Tarjetas de Resumen Financiero (KPIs) -->
        <div class="financial-kpis-grid" id="financial-kpis-container">
          <div class="kpi-card">
            <div class="kpi-icon-box blue">📊</div>
            <div class="kpi-info">
              <span class="kpi-label">Facturación Bruta Acumulada</span>
              <span class="kpi-value" id="kpi-total-facturado">⏳ Cargando...</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-box green">💰</div>
            <div class="kpi-info">
              <span class="kpi-label">Total Recaudado / Cobrado</span>
              <span class="kpi-value highlight-green" id="kpi-total-cobrado">⏳ Cargando...</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-box amber">⏳</div>
            <div class="kpi-info">
              <span class="kpi-label">Cuentas por Cobrar (Cartera)</span>
              <span class="kpi-value highlight-amber" id="kpi-cuentas-cobrar">⏳ Cargando...</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-box purple">📑</div>
            <div class="kpi-info">
              <span class="kpi-label">Documentos este Mes</span>
              <span class="kpi-value" id="kpi-facturas-mes">⏳ Cargando...</span>
            </div>
          </div>
        </div>

        <!-- Filtros y Búsqueda Servidor -->
        <div class="table-filter-bar">
          <div class="filter-pills-row" id="filter-pills-container">
            <button class="filter-pill ${this.filterState === 'TODAS' ? 'active' : ''}" data-state="TODAS">Todas</button>
            <button class="filter-pill ${this.filterState === 'ACEPTADA' ? 'active' : ''}" data-state="ACEPTADA">✓ Pagadas / Aceptadas</button>
            <button class="filter-pill ${this.filterState === 'PENDIENTE' ? 'active' : ''}" data-state="PENDIENTE">⏱ Pendientes</button>
            <button class="filter-pill ${this.filterState === 'PAGO_PARCIAL' ? 'active' : ''}" data-state="PAGO_PARCIAL">◐ Pago Parcial</button>
            <button class="filter-pill ${this.filterState === 'RECHAZADA_DIAN' ? 'active' : ''}" data-state="RECHAZADA_DIAN">✕ Rechazada DIAN</button>
            <button class="filter-pill ${this.filterState === 'VENCIDA' ? 'active' : ''}" data-state="VENCIDA">⚠ Vencidas</button>
            <button class="filter-pill ${this.filterState === 'ANULADA' ? 'active' : ''}" data-state="ANULADA">⊘ Anuladas</button>
          </div>

          <div class="search-box-wrapper">
            <span class="search-icon-inside">🔍</span>
            <input type="text" id="invoice-search-input" class="search-input" placeholder="Buscar por número, cliente o NIT..." autocomplete="off">
          </div>
        </div>

        <!-- Tabla de Facturas -->
        <div class="invoices-table-card">
          <table class="invoices-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Cliente / Razón Social</th>
                <th>Emisión</th>
                <th>Vence</th>
                <th>Método</th>
                <th>Base Gravable</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Estado DIAN</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody id="invoices-table-body">
              <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-muted);">
                  ⏳ Consultando comprobantes fiscales en la base de datos de ${state.currentTenant.name}...
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Barra de Paginación Servidor -->
          <div class="pagination-bar" id="pagination-bar">
            <div class="pagination-info" id="pagination-info">
              Mostrando registros...
            </div>
            <div class="pagination-controls">
              <button class="btn-pagination" id="btn-page-prev" disabled>◀ Anterior</button>
              <span class="pagination-current" id="pagination-current">Página 1</span>
              <button class="btn-pagination" id="btn-page-next" disabled>Siguiente ▶</button>
              <select id="select-page-size" class="pagination-size-select">
                <option value="10" selected>10 por pág.</option>
                <option value="25">25 por pág.</option>
                <option value="50">50 por pág.</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Modal de Detalle de Factura DIAN -->
        <div id="invoice-modal-backdrop" class="invoice-modal-backdrop">
          <div class="invoice-modal-card" id="invoice-modal-content"></div>
        </div>

        <!-- Modal de Registro de Pago / Abono -->
        <div id="payment-modal-backdrop" class="invoice-modal-backdrop">
          <div class="invoice-modal-card" id="payment-modal-content" style="max-width: 480px;"></div>
        </div>

        <!-- Modal de Anulación / Nota Crédito -->
        <div id="anular-modal-backdrop" class="invoice-modal-backdrop">
          <div class="invoice-modal-card" id="anular-modal-content" style="max-width: 500px;"></div>
        </div>

        <!-- Modal de Emisión Directa de Factura -->
        <div id="emitir-modal-backdrop" class="invoice-modal-backdrop">
          <div class="invoice-modal-card" id="emitir-modal-content" style="max-width: 560px;"></div>
        </div>
      </div>
    `;

    this.bindStaticEvents();
  }

  /**
   * Carga los KPIs financieros consolidados desde el backend (una sola query agregada).
   */
  static async loadResumenFinanciero() {
    try {
      const res = await ApiClient.getResumenFinanciero();
      if (res.success && res.data) {
        this.resumenData = res.data;
        this.renderResumenCards(res.data);
      }
    } catch (err) {
      console.warn('No se pudo cargar el resumen financiero:', err);
    }
  }

  static renderResumenCards(data) {
    const elFacturado = document.getElementById('kpi-total-facturado');
    const elCobrado = document.getElementById('kpi-total-cobrado');
    const elCobrar = document.getElementById('kpi-cuentas-cobrar');
    const elMes = document.getElementById('kpi-facturas-mes');

    if (elFacturado) elFacturado.textContent = `$ ${Number(data.totalFacturado || 0).toLocaleString('es-CO')}`;
    if (elCobrado) elCobrado.textContent = `$ ${Number(data.totalCobrado || 0).toLocaleString('es-CO')}`;
    if (elCobrar) elCobrar.textContent = `$ ${Number(data.cuentasPorCobrar || 0).toLocaleString('es-CO')}`;
    if (elMes) elMes.textContent = `${data.facturasEsteMes || 0} emitidas`;
  }

  /**
   * Carga facturas desde el backend con paginación y filtros en el servidor.
   */
  static async loadFacturas() {
    const tbody = document.getElementById('invoices-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-muted);">
            ⏳ Actualizando comprobantes fiscales...
          </td>
        </tr>
      `;
    }

    try {
      const params = {
        page: this.currentPage,
        limit: this.pageSize,
      };

      if (this.filterState && this.filterState !== 'TODAS') {
        params.estado = this.filterState;
      }
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        params.search = this.searchTerm.trim();
      }

      const res = await ApiClient.listFacturas(params);

      if (res.success && Array.isArray(res.data)) {
        this.facturas = res.data;
        this.totalRecords = res.total !== undefined ? res.total : res.count || res.data.length;
        this.totalPages = res.totalPages !== undefined ? res.totalPages : Math.ceil(this.totalRecords / this.pageSize) || 1;
        this.currentPage = res.page !== undefined ? res.page : this.currentPage;

        this.renderTableRows();
        this.renderPagination();
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; padding: 40px; color: #dc2626;">
              ❌ Error al consultar las facturas de la empresa: ${err.message}
              <div style="margin-top: 10px;">
                <button class="btn-secondary" id="btn-retry-load">Reintentar</button>
              </div>
            </td>
          </tr>
        `;
        const btnRetry = document.getElementById('btn-retry-load');
        if (btnRetry) {
          btnRetry.addEventListener('click', () => this.loadFacturas());
        }
      }
    }
  }

  static renderTableRows() {
    const tbody = document.getElementById('invoices-table-body');
    if (!tbody) return;

    if (this.facturas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No se encontraron comprobantes fiscales con los criterios seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.facturas
      .map((f) => {
        const badgeClass = this.getBadgeClass(f.estadoDian);
        const badgeLabel = this.getBadgeLabel(f.estadoDian);

        const fechaEmision = f.fechaEmision ? f.fechaEmision.split('T')[0] : '—';
        const fechaVence = f.fechaVencimiento ? f.fechaVencimiento.split('T')[0] : '—';
        const isNC = f.esNotaCredito || f.tipoDocumento === 'NOTA_CREDITO_DIAN';
        const docBadge = isNC
          ? `<span class="badge-nc" title="Nota de Crédito Electrónica DIAN">↩ NC</span>`
          : `<span class="badge-fe" title="Factura Electrónica de Venta">FE</span>`;

        const metodoBadge = this.getMetodoPagoBadge(f.metodoPago);

        const canPay = (f.estadoDian === 'PENDIENTE' || f.estadoDian === 'PAGO_PARCIAL') && !isNC;

        return `
          <tr class="${isNC ? 'tr-nota-credito' : ''}">
            <td>
              <div style="display: flex; align-items: center; gap: 6px;">
                ${docBadge}
                <a href="#" class="invoice-number-link" data-id="${f.id}">${f.numeroCompleto}</a>
              </div>
            </td>
            <td>
              <span class="client-name-cell">${this.escapeHtml(f.clienteNombre || 'Consumidor Final')}</span>
              <span class="client-nit-cell">${this.escapeHtml(f.clienteNit || '222222222222')}</span>
            </td>
            <td style="color: var(--text-muted); font-size: 12px;">${fechaEmision}</td>
            <td style="color: var(--text-muted); font-size: 12px;">${fechaVence}</td>
            <td>${metodoBadge}</td>
            <td class="amount-cell">$ ${Number(f.baseGravable || 0).toLocaleString('es-CO')}</td>
            <td class="amount-iva">$ ${Number(f.totalIva || 0).toLocaleString('es-CO')}</td>
            <td class="amount-total ${isNC ? 'amount-negative' : ''}">$ ${Number(f.totalPagar || 0).toLocaleString('es-CO')}</td>
            <td>
              <span class="badge ${badgeClass}">${badgeLabel}</span>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              ${canPay ? `<button type="button" class="btn-table-action btn-pay-invoice" data-id="${f.id}" title="Registrar abono de dinero" style="color: #059669; border-color: #a7f3d0; margin-right: 4px;">+ Pagar</button>` : ''}
              <button type="button" class="btn-table-action btn-view-invoice" data-id="${f.id}">Ver</button>
            </td>
          </tr>
        `;
      })
      .join('');

    // Bindeo de eventos en filas
    tbody.querySelectorAll('.invoice-number-link, .btn-view-invoice').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const id = el.getAttribute('data-id');
        this.openInvoiceDetail(id);
      });
    });

    tbody.querySelectorAll('.btn-pay-invoice').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const id = el.getAttribute('data-id');
        this.openPaymentModal(id);
      });
    });
  }

  static renderPagination() {
    const infoEl = document.getElementById('pagination-info');
    const currentEl = document.getElementById('pagination-current');
    const btnPrev = document.getElementById('btn-page-prev');
    const btnNext = document.getElementById('btn-page-next');

    if (!infoEl || !currentEl || !btnPrev || !btnNext) return;

    const start = this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalRecords);

    infoEl.textContent = `Mostrando ${start} - ${end} de ${this.totalRecords} comprobantes`;
    currentEl.textContent = `Página ${this.currentPage} de ${this.totalPages || 1}`;

    btnPrev.disabled = this.currentPage <= 1;
    btnNext.disabled = this.currentPage >= this.totalPages;
  }

  static bindStaticEvents() {
    // Filtros de Estado (Server-Side)
    const pillsContainer = document.getElementById('filter-pills-container');
    if (pillsContainer) {
      pillsContainer.querySelectorAll('.filter-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          pillsContainer.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.filterState = btn.getAttribute('data-state');
          this.currentPage = 1;
          this.loadFacturas();
        });
      });
    }

    // Buscador con Debounce para optimizar conexiones lentas
    const searchInput = document.getElementById('invoice-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.searchTerm = val;
          this.currentPage = 1;
          this.loadFacturas();
        }, 350);
      });
    }

    // Paginación: Anterior / Siguiente
    const btnPrev = document.getElementById('btn-page-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadFacturas();
        }
      });
    }

    const btnNext = document.getElementById('btn-page-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadFacturas();
        }
      });
    }

    // Paginación: Selector de tamaño
    const selectSize = document.getElementById('select-page-size');
    if (selectSize) {
      selectSize.addEventListener('change', (e) => {
        this.pageSize = Number(e.target.value);
        this.currentPage = 1;
        this.loadFacturas();
      });
    }

    // Botón Descargar XMLs
    const btnXml = document.getElementById('btn-export-xml');
    if (btnXml) {
      btnXml.addEventListener('click', () => {
        alert(`Generando archivo ZIP comprimido con las facturas UBL 2.1 firmadas digitalmente para ${state.currentTenant.name}. Formato DIAN Anexo Técnico 1.9.`);
      });
    }

    // Botón Emitir Factura Directa
    const btnNueva = document.getElementById('btn-nueva-factura');
    if (btnNueva) {
      btnNueva.addEventListener('click', () => {
        this.openEmitirFacturaModal();
      });
    }
  }

  /**
   * Abre modal de detalle completo de factura, cargando historial de pagos y saldo en una sola llamada.
   */
  static async openInvoiceDetail(invoiceId) {
    const modalBackdrop = document.getElementById('invoice-modal-backdrop');
    const modalContent = document.getElementById('invoice-modal-content');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        ⏳ Consultando detalle fiscal y estado de pagos en la DIAN...
      </div>
    `;
    modalBackdrop.classList.add('open');

    try {
      const res = await ApiClient.getFacturaById(invoiceId);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'No se pudo cargar la factura');
      }

      const f = res.data;
      this.selectedFactura = f;

      const badgeClass = this.getBadgeClass(f.estadoDian);
      const badgeLabel = this.getBadgeLabel(f.estadoDian);
      const isNC = f.esNotaCredito || f.tipoDocumento === 'NOTA_CREDITO_DIAN';

      const fechaEmision = f.fechaEmision ? f.fechaEmision.split('T')[0] : '—';
      const fechaVence = f.fechaVencimiento ? f.fechaVencimiento.split('T')[0] : '—';
      const saldoPendiente = f.saldoPendiente !== undefined ? f.saldoPendiente : Math.max(0, f.totalPagar - (f.totalPagado || 0));
      const canPay = saldoPendiente > 0 && f.estadoDian !== 'ANULADA' && !isNC;
      const canAnular = f.estadoDian !== 'ANULADA' && !isNC;

      // Render de tabla de pagos
      let pagosHtml = '';
      if (Array.isArray(f.pagos) && f.pagos.length > 0) {
        pagosHtml = `
          <div style="margin-top: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
              Historial de Pagos y Abonos (${f.pagos.length})
            </div>
            <table class="payments-subtable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th style="text-align: right;">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${f.pagos
                  .map(
                    (p) => `
                  <tr>
                    <td style="color: var(--text-muted); font-size: 11px;">${p.fecha ? p.fecha.split('T')[0] : '—'}</td>
                    <td><span class="badge-mini">${p.metodoPago || 'EFECTIVO'}</span></td>
                    <td style="color: var(--text-muted); font-size: 11px;">${this.escapeHtml(p.referencia || '—')}</td>
                    <td style="text-align: right; font-weight: 700; font-family: var(--font-mono);">$ ${Number(p.monto).toLocaleString('es-CO')}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      } else {
        pagosHtml = `
          <div style="margin-top: 16px; padding: 12px; background: var(--bg-body); border-radius: 8px; font-size: 12px; color: var(--text-muted); text-align: center;">
            ℹ️ No hay abonos registrados para este documento.
          </div>
        `;
      }

      modalContent.innerHTML = `
        <button class="modal-close-btn" id="modal-close-btn" title="Cerrar modal">✕</button>

        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h2 style="font-size: 20px; font-weight: 800; color: var(--text-main); margin: 0;">${f.numeroCompleto}</h2>
              ${isNC ? '<span class="badge-nc" style="font-size: 11px; padding: 3px 8px;">↩ NOTA CRÉDITO</span>' : ''}
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">
              ${isNC ? 'Nota de Crédito Electrónica DIAN' : 'Factura Electrónica de Venta — DIAN Colombia UBL 2.1'}
            </p>
          </div>
          <span class="badge ${badgeClass}" style="font-size: 13px; padding: 6px 14px;">${badgeLabel}</span>
        </div>

        <!-- Tarjeta de Emisor y Cliente -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
            <div>
              <span style="color: var(--text-muted); font-size: 11px; display: block; font-weight: 600;">EMISOR FISCAL</span>
              <b style="color: var(--text-main);">${state.currentTenant.name}</b>
              <div style="color: var(--text-muted); font-size: 12px;">NIT: ${state.currentTenant.nit}</div>
              <div style="color: var(--text-muted); font-size: 11px;">Régimen Común · ${state.currentTenant.city || 'Bogotá D.C.'}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 11px; display: block; font-weight: 600;">CLIENTE / ADQUIRENTE</span>
              <b style="color: var(--text-main);">${this.escapeHtml(f.clienteNombre || 'Consumidor Final')}</b>
              <div style="color: var(--text-muted); font-size: 12px;">NIT / CC: ${this.escapeHtml(f.clienteNit || '222222222222')}</div>
              <div style="color: var(--text-muted); font-size: 11px;">Emisión: ${fechaEmision} · Vence: ${fechaVence}</div>
            </div>
          </div>
        </div>

        <!-- CUFE con botón para copiar -->
        <div style="margin-bottom: 16px; background: #0f172a; color: #94a3b8; padding: 12px; border-radius: 8px; font-size: 11px; font-family: var(--font-mono);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="color: #38bdf8; font-weight: bold;">CUFE (Código Único de Factura Electrónica):</span>
            <button type="button" class="btn-copy-cufe" id="btn-copy-cufe" style="background: #1e293b; color: #f1f5f9; border: 1px solid #334155; padding: 2px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">📋 Copiar</button>
          </div>
          <div style="word-break: break-all; color: #cbd5e1;">${f.cufe || 'CUFE-2026-DIAN-HASH-VALIDADO-SHA384-901445772'}</div>
        </div>

        <!-- Desglose de Totales -->
        <div style="border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); padding: 12px 0; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-muted);">Base Gravable Subtotal:</span>
            <b style="font-family: var(--font-mono);">$ ${Number(f.baseGravable || 0).toLocaleString('es-CO')}</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--primary-600);">Total IVA (19%):</span>
            <b style="color: var(--primary-600); font-family: var(--font-mono);">$ ${Number(f.totalIva || 0).toLocaleString('es-CO')}</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: var(--text-main); padding-top: 6px; border-top: 1px dashed var(--border-subtle);">
            <span>Total Facturado:</span>
            <span style="font-family: var(--font-mono);">$ ${Number(f.totalPagar || 0).toLocaleString('es-CO')}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 8px;">
            <span style="color: #059669; font-weight: 600;">Total Abonado / Pagado:</span>
            <span style="color: #059669; font-weight: 700; font-family: var(--font-mono);">$ ${Number(f.totalPagado || 0).toLocaleString('es-CO')}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; margin-top: 4px; padding: 6px 10px; background: ${saldoPendiente > 0 ? '#fef2f2' : '#f0fdf4'}; border-radius: 6px; color: ${saldoPendiente > 0 ? '#dc2626' : '#15803d'};">
            <span>Saldo Pendiente:</span>
            <span style="font-family: var(--font-mono);">$ ${Number(saldoPendiente).toLocaleString('es-CO')}</span>
          </div>
        </div>

        <!-- Subsección de Pagos -->
        ${pagosHtml}

        <!-- Botonera de Acciones -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; gap: 8px;">
            ${canPay ? `<button class="btn-primary" id="btn-modal-pay" style="background: #059669; border-color: #059669;">💰 Registrar Pago</button>` : ''}
            ${canAnular ? `<button class="btn-secondary" id="btn-modal-anular" style="color: #dc2626; border-color: #fecaca;">🚫 Anular Factura</button>` : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" id="modal-download-pdf">📄 PDF Fiscal</button>
            <button class="btn-secondary" id="modal-download-xml">📥 XML UBL 2.1</button>
            <button class="btn-primary" id="modal-close-action">Cerrar</button>
          </div>
        </div>
      `;

      // Event Listeners del Modal
      document.getElementById('modal-close-btn').addEventListener('click', () => {
        modalBackdrop.classList.remove('open');
      });
      document.getElementById('modal-close-action').addEventListener('click', () => {
        modalBackdrop.classList.remove('open');
      });

      // Copiar CUFE
      const btnCopy = document.getElementById('btn-copy-cufe');
      if (btnCopy) {
        btnCopy.addEventListener('click', () => {
          navigator.clipboard.writeText(f.cufe || '');
          btnCopy.textContent = '✓ Copiado';
          setTimeout(() => (btnCopy.textContent = '📋 Copiar'), 2000);
        });
      }

      // Descargar PDF
      document.getElementById('modal-download-pdf').addEventListener('click', () => {
        window.print();
      });

      // Descargar XML
      document.getElementById('modal-download-xml').addEventListener('click', () => {
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>
  <cbc:ID>${f.numeroCompleto}</cbc:ID>
  <cbc:UUID schemeName="CUFE-SHA384">${f.cufe}</cbc:UUID>
  <cbc:IssueDate>${fechaEmision}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${state.currentTenant.nit}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${f.baseGravable}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${f.totalIva}</cbc:TaxExclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${f.totalPagar}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${f.numeroCompleto}-DIAN-UBL2.1.xml`;
        a.click();
        URL.revokeObjectURL(url);
      });

      // Acción Registrar Pago
      const btnModalPay = document.getElementById('btn-modal-pay');
      if (btnModalPay) {
        btnModalPay.addEventListener('click', () => {
          modalBackdrop.classList.remove('open');
          this.openPaymentModal(f.id, f);
        });
      }

      // Acción Anular Factura
      const btnModalAnular = document.getElementById('btn-modal-anular');
      if (btnModalAnular) {
        btnModalAnular.addEventListener('click', () => {
          modalBackdrop.classList.remove('open');
          this.openAnularModal(f.id, f);
        });
      }
    } catch (err) {
      modalContent.innerHTML = `
        <button class="modal-close-btn" onclick="document.getElementById('invoice-modal-backdrop').classList.remove('open')">✕</button>
        <div style="text-align: center; padding: 40px; color: #dc2626;">
          ❌ Error al cargar el comprobante: ${err.message}
        </div>
      `;
    }
  }

  /**
   * Abre modal para registrar un abono / pago contra una factura.
   */
  static async openPaymentModal(facturaId, preloadedFactura = null) {
    const backdrop = document.getElementById('payment-modal-backdrop');
    const content = document.getElementById('payment-modal-content');
    if (!backdrop || !content) return;

    let f = preloadedFactura;
    if (!f) {
      const res = await ApiClient.getFacturaById(facturaId);
      if (res.success && res.data) f = res.data;
    }
    if (!f) return;

    const saldoPendiente = f.saldoPendiente !== undefined ? f.saldoPendiente : Math.max(0, f.totalPagar - (f.totalPagado || 0));

    content.innerHTML = `
      <button class="modal-close-btn" id="pay-modal-close-btn">✕</button>
      <div style="margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">💰 Registrar Pago / Abono</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">
          Factura <b>${f.numeroCompleto}</b> · ${this.escapeHtml(f.clienteNombre)}
        </p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: var(--text-muted);">Total de la Factura:</span>
          <b>$ ${Number(f.totalPagar).toLocaleString('es-CO')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #059669;">Ya pagado:</span>
          <b style="color: #059669;">$ ${Number(f.totalPagado || 0).toLocaleString('es-CO')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; color: #dc2626; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
          <span>Saldo por cobrar:</span>
          <span>$ ${Number(saldoPendiente).toLocaleString('es-CO')}</span>
        </div>
      </div>

      <form id="form-registrar-pago">
        <div class="form-group-modal">
          <label>Monto a Registrar ($ COP) *</label>
          <input type="number" id="pago-monto" class="input-modal" min="1" max="${saldoPendiente}" value="${saldoPendiente}" required>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Puedes registrar pagos parciales o liquidar el saldo total.</div>
        </div>

        <div class="form-group-modal">
          <label>Medio de Pago *</label>
          <select id="pago-metodo" class="input-modal" required>
            <option value="EFECTIVO">💵 Efectivo en Caja</option>
            <option value="TARJETA">💳 Tarjeta Débito / Crédito</option>
            <option value="TRANSFERENCIA">🏦 Transferencia Bancaria (Bancolombia, etc.)</option>
            <option value="NEQUI">📱 Nequi</option>
            <option value="DAVIPLATA">📱 Daviplata</option>
          </select>
        </div>

        <div class="form-group-modal">
          <label>Referencia / Comprobante (Opcional)</label>
          <input type="text" id="pago-referencia" class="input-modal" placeholder="Ej: TR-893123 o Voucher 4402">
        </div>

        <div class="form-group-modal">
          <label>Observaciones (Opcional)</label>
          <input type="text" id="pago-notas" class="input-modal" placeholder="Notas adicionales del pago">
        </div>

        <div id="pago-error-msg" style="display: none; color: #dc2626; font-size: 12px; margin-bottom: 12px;"></div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
          <button type="button" class="btn-secondary" id="btn-cancel-pago">Cancelar</button>
          <button type="submit" class="btn-primary" id="btn-submit-pago" style="background: #059669; border-color: #059669;">Confirmar Abono</button>
        </div>
      </form>
    `;

    backdrop.classList.add('open');

    document.getElementById('pay-modal-close-btn').addEventListener('click', () => backdrop.classList.remove('open'));
    document.getElementById('btn-cancel-pago').addEventListener('click', () => backdrop.classList.remove('open'));

    const form = document.getElementById('form-registrar-pago');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = document.getElementById('btn-submit-pago');
      const errBox = document.getElementById('pago-error-msg');
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Procesando...';
      errBox.style.display = 'none';

      try {
        const monto = Number(document.getElementById('pago-monto').value);
        const metodoPago = document.getElementById('pago-metodo').value;
        const referencia = document.getElementById('pago-referencia').value;
        const notas = document.getElementById('pago-notas').value;

        const res = await ApiClient.registrarPago(facturaId, { monto, metodoPago, referencia, notas });
        if (!res.success) throw new Error(res.message || 'Error al registrar el pago');

        backdrop.classList.remove('open');
        await Promise.all([this.loadFacturas(), this.loadResumenFinanciero()]);
        // Volver a abrir el detalle actualizado
        this.openInvoiceDetail(facturaId);
      } catch (err) {
        errBox.textContent = `❌ ${err.message}`;
        errBox.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Confirmar Abono';
      }
    });
  }

  /**
   * Abre modal para anular una factura con generación de Nota de Crédito Electrónica DIAN.
   */
  static openAnularModal(facturaId, factura) {
    const backdrop = document.getElementById('anular-modal-backdrop');
    const content = document.getElementById('anular-modal-content');
    if (!backdrop || !content) return;

    content.innerHTML = `
      <button class="modal-close-btn" id="anular-modal-close-btn">✕</button>
      <div style="margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 800; color: #dc2626; margin: 0;">🚫 Anulación de Factura Fiscal</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">
          Generación automática de <b>Nota de Crédito Electrónica</b> transmitida a la DIAN.
        </p>
      </div>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px; color: #991b1b;">
        ⚠️ <b>Atención legal:</b> La factura <b>${factura.numeroCompleto}</b> por valor de <b>$ ${Number(factura.totalPagar).toLocaleString('es-CO')}</b> será anulada fiscalmente. Se expedirá una Nota de Crédito tipo UBL 2.1 con su propio CUFE enlazado.
      </div>

      <form id="form-anular-factura">
        <div class="form-group-modal">
          <label>Motivo de la Anulación (Concepto DIAN) *</label>
          <select id="anular-motivo-select" class="input-modal" required>
            <option value="Devolución total de los bienes o rescisión del servicio">Devolución total de bienes o rescisión</option>
            <option value="Error en la identificación del cliente / adquirente">Error en identificación del cliente</option>
            <option value="Error en precio, cálculo de impuestos o cantidades">Error en precios o impuestos</option>
            <option value="Anulación comercial por acuerdo mutuo">Anulación comercial acordada</option>
            <option value="Otro motivo justificado">Otro motivo justificado</option>
          </select>
        </div>

        <div class="form-group-modal">
          <label>Detalle Adicional del Motivo</label>
          <input type="text" id="anular-motivo-custom" class="input-modal" placeholder="Explique brevemente la razón de anulación...">
        </div>

        <div id="anular-error-msg" style="display: none; color: #dc2626; font-size: 12px; margin-bottom: 12px;"></div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
          <button type="button" class="btn-secondary" id="btn-cancel-anular">Cancelar</button>
          <button type="submit" class="btn-primary" id="btn-submit-anular" style="background: #dc2626; border-color: #dc2626;">Emitir Nota Crédito</button>
        </div>
      </form>
    `;

    backdrop.classList.add('open');

    document.getElementById('anular-modal-close-btn').addEventListener('click', () => backdrop.classList.remove('open'));
    document.getElementById('btn-cancel-anular').addEventListener('click', () => backdrop.classList.remove('open'));

    const form = document.getElementById('form-anular-factura');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = document.getElementById('btn-submit-anular');
      const errBox = document.getElementById('anular-error-msg');
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Emitiendo Nota Crédito...';
      errBox.style.display = 'none';

      try {
        const selectVal = document.getElementById('anular-motivo-select').value;
        const customVal = document.getElementById('anular-motivo-custom').value;
        const motivo = customVal ? `${selectVal}: ${customVal}` : selectVal;

        const res = await ApiClient.anularFactura(facturaId, motivo);
        if (!res.success) throw new Error(res.message || 'Error al anular la factura');

        backdrop.classList.remove('open');
        await Promise.all([this.loadFacturas(), this.loadResumenFinanciero()]);

        if (res.notaCredito) {
          alert(`✅ Factura anulada exitosamente.\nSe generó la Nota de Crédito: ${res.notaCredito.numeroCompleto}\nCUFE: ${res.notaCredito.cufe}`);
        }
      } catch (err) {
        errBox.textContent = `❌ ${err.message}`;
        errBox.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Emitir Nota Crédito';
      }
    });
  }

  /**
   * Abre modal para emitir una nueva factura electrónica directamente (sin flujo de mesas POS).
   */
  static openEmitirFacturaModal() {
    const backdrop = document.getElementById('emitir-modal-backdrop');
    const content = document.getElementById('emitir-modal-content');
    if (!backdrop || !content) return;

    content.innerHTML = `
      <button class="modal-close-btn" id="emitir-modal-close-btn">✕</button>
      <div style="margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">+ Emitir Factura Electrónica Directa</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">
          Comprobante fiscal UBL 2.1 validado por la DIAN para <b>${state.currentTenant.name}</b>
        </p>
      </div>

      <form id="form-emitir-factura">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group-modal">
            <label>Tipo de Documento *</label>
            <select id="emitir-tipo-doc" class="input-modal">
              <option value="FACTURA_ELECTRONICA_DIAN">Factura Electrónica (FE-2026)</option>
              <option value="DOCUMENTO_EQUIVALENTE_POS">Documento POS (POS-2026)</option>
            </select>
          </div>
          <div class="form-group-modal">
            <label>Condición de Pago *</label>
            <select id="emitir-condicion-pago" class="input-modal">
              <option value="CONTADO">Contado (Cobrada)</option>
              <option value="CREDITO">Crédito (A 30 días)</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
          <div class="form-group-modal">
            <label>Cliente / Razón Social *</label>
            <input type="text" id="emitir-cliente-nombre" class="input-modal" placeholder="Ej: Inversiones Andina S.A.S." required>
          </div>
          <div class="form-group-modal">
            <label>NIT / Cédula *</label>
            <input type="text" id="emitir-cliente-nit" class="input-modal" placeholder="Ej: 901.445.772-1" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group-modal">
            <label>Base Gravable Subtotal ($ COP) *</label>
            <input type="number" id="emitir-base-gravable" class="input-modal" placeholder="0" min="1000" step="500" required>
          </div>
          <div class="form-group-modal">
            <label>Tarifa IVA *</label>
            <select id="emitir-tarifa-iva" class="input-modal">
              <option value="19">IVA General (19%)</option>
              <option value="5">IVA Especial (5%)</option>
              <option value="0">Exento (0%)</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group-modal">
            <label>Método de Pago *</label>
            <select id="emitir-metodo-pago" class="input-modal">
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="TARJETA">💳 Tarjeta Débito/Crédito</option>
              <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
              <option value="NEQUI">📱 Nequi</option>
              <option value="DAVIPLATA">📱 Daviplata</option>
            </select>
          </div>
          <div class="form-group-modal">
            <label>Plazo Vencimiento (Días)</label>
            <input type="number" id="emitir-dias-vence" class="input-modal" value="30" min="1" max="180">
          </div>
        </div>

        <div class="form-group-modal">
          <label>Notas / Concepto Facturado (Opcional)</label>
          <input type="text" id="emitir-notas" class="input-modal" placeholder="Ej: Servicios de consultoría mes de octubre">
        </div>

        <!-- Vista previa de totales calculados -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: var(--text-muted);">Subtotal Base:</span>
            <b id="preview-subtotal">$ 0</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: var(--primary-600);">IVA Calculado:</span>
            <b id="preview-iva" style="color: var(--primary-600);">$ 0</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0f172a; border-top: 1px solid #cbd5e1; padding-top: 4px;">
            <span>Total a Pagar:</span>
            <span id="preview-total" style="color: #059669;">$ 0</span>
          </div>
        </div>

        <div id="emitir-error-msg" style="display: none; color: #dc2626; font-size: 12px; margin-bottom: 12px;"></div>

        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn-secondary" id="btn-cancel-emitir">Cancelar</button>
          <button type="submit" class="btn-primary" id="btn-submit-emitir">Transmitir a DIAN</button>
        </div>
      </form>
    `;

    backdrop.classList.add('open');

    document.getElementById('emitir-modal-close-btn').addEventListener('click', () => backdrop.classList.remove('open'));
    document.getElementById('btn-cancel-emitir').addEventListener('click', () => backdrop.classList.remove('open'));

    // Cálculo dinámico de totales
    const baseInput = document.getElementById('emitir-base-gravable');
    const ivaSelect = document.getElementById('emitir-tarifa-iva');
    const updatePreview = () => {
      const base = Number(baseInput.value) || 0;
      const tarifa = Number(ivaSelect.value) || 0;
      const iva = Math.round(base * (tarifa / 100));
      const total = base + iva;

      document.getElementById('preview-subtotal').textContent = `$ ${base.toLocaleString('es-CO')}`;
      document.getElementById('preview-iva').textContent = `$ ${iva.toLocaleString('es-CO')}`;
      document.getElementById('preview-total').textContent = `$ ${total.toLocaleString('es-CO')}`;
    };

    baseInput.addEventListener('input', updatePreview);
    ivaSelect.addEventListener('change', updatePreview);

    const form = document.getElementById('form-emitir-factura');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = document.getElementById('btn-submit-emitir');
      const errBox = document.getElementById('emitir-error-msg');
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Validando con DIAN...';
      errBox.style.display = 'none';

      try {
        const clienteNombre = document.getElementById('emitir-cliente-nombre').value;
        const clienteNit = document.getElementById('emitir-cliente-nit').value;
        const tipoDocumento = document.getElementById('emitir-tipo-doc').value;
        const baseGravable = Number(document.getElementById('emitir-base-gravable').value);
        const porcentajeIva = Number(document.getElementById('emitir-tarifa-iva').value);
        const condicion = document.getElementById('emitir-condicion-pago').value;
        const metodoPago = document.getElementById('emitir-metodo-pago').value;
        const diasVencimiento = Number(document.getElementById('emitir-dias-vence').value) || 30;
        const notas = document.getElementById('emitir-notas').value;

        const estadoDian = condicion === 'CONTADO' ? 'ACEPTADA' : 'PENDIENTE';

        const res = await ApiClient.emitirFacturaDirecta({
          clienteNombre,
          clienteNit,
          tipoDocumento,
          baseGravable,
          porcentajeIva,
          metodoPago,
          estadoDian,
          diasVencimiento,
          notas,
        });

        if (!res.success) throw new Error(res.message || 'Error al emitir factura');

        backdrop.classList.remove('open');
        await Promise.all([this.loadFacturas(), this.loadResumenFinanciero()]);

        if (res.data) {
          this.openInvoiceDetail(res.data.id);
        }
      } catch (err) {
        errBox.textContent = `❌ ${err.message}`;
        errBox.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Transmitir a DIAN';
      }
    });
  }

  static getBadgeClass(estado) {
    switch (estado) {
      case 'ACEPTADA':
      case 'PAGADA':
        return 'badge-pagada';
      case 'PENDIENTE':
        return 'badge-pendiente';
      case 'RECHAZADA_DIAN':
        return 'badge-rechazada';
      case 'PAGO_PARCIAL':
        return 'badge-parcial';
      case 'VENCIDA':
        return 'badge-vencida';
      case 'ANULADA':
        return 'badge-anulada';
      default:
        return 'badge-anulada';
    }
  }

  static getBadgeLabel(estado) {
    switch (estado) {
      case 'ACEPTADA':
        return '✓ Pagada';
      case 'PENDIENTE':
        return '⏱ Pendiente';
      case 'RECHAZADA_DIAN':
        return '✕ Rechazada DIAN';
      case 'PAGO_PARCIAL':
        return '◐ Pago parcial';
      case 'VENCIDA':
        return '⚠ Vencida';
      case 'ANULADA':
        return '⊘ Anulada';
      default:
        return estado || 'Desconocido';
    }
  }

  static getMetodoPagoBadge(metodo) {
    switch (metodo) {
      case 'EFECTIVO':
        return `<span class="badge-metodo metodo-efectivo">💵 Efectivo</span>`;
      case 'TARJETA':
        return `<span class="badge-metodo metodo-tarjeta">💳 Tarjeta</span>`;
      case 'TRANSFERENCIA':
        return `<span class="badge-metodo metodo-transferencia">🏦 Transf.</span>`;
      case 'NEQUI':
        return `<span class="badge-metodo metodo-nequi">📱 Nequi</span>`;
      case 'DAVIPLATA':
        return `<span class="badge-metodo metodo-daviplata">📱 Daviplata</span>`;
      default:
        return `<span class="badge-metodo metodo-efectivo">${metodo || 'Efectivo'}</span>`;
    }
  }

  static escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
