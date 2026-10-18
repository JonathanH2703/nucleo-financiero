/**
 * VISTA DE FACTURACIÓN ELECTRÓNICA DIAN — NÚCLEO FINANCIERO (FIGMA DESIGN)
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

export class FacturacionView {
  static async mount(container) {
    this.container = container;
    this.facturas = [];
    this.filterState = 'TODAS';
    this.searchTerm = '';
    this.selectedFactura = null;

    this.renderSkeleton();
    await this.loadFacturas();
  }

  static renderSkeleton() {
    this.container.innerHTML = `
      <div class="facturacion-container">
        <div class="facturacion-header-card">
          <div class="facturacion-title-group">
            <h2>
              <span>📑 Facturación Electrónica DIAN</span>
              <span class="badge badge-aceptada">Habilitado DIAN 2026</span>
            </h2>
            <p>Registro de comprobantes fiscales emitidos bajo el estándar UBL 2.1 · ${state.currentTenant.name}</p>
          </div>

          <div class="facturacion-actions">
            <button class="btn-secondary" id="btn-export-xml">Descargar XMLs</button>
            <button class="btn-primary" id="btn-nueva-factura">+ Emitir Nueva Factura</button>
          </div>
        </div>

        <!-- Filtros y Búsqueda -->
        <div class="table-filter-bar">
          <div class="filter-pills-row" id="filter-pills-container">
            <button class="filter-pill ${this.filterState === 'TODAS' ? 'active' : ''}" data-state="TODAS">Todas (11)</button>
            <button class="filter-pill" data-state="ACEPTADA">Pagada / Aceptada</button>
            <button class="filter-pill" data-state="PENDIENTE">Pendiente</button>
            <button class="filter-pill" data-state="PAGO_PARCIAL">Pago Parcial</button>
            <button class="filter-pill" data-state="RECHAZADA_DIAN">Rechazada DIAN</button>
            <button class="filter-pill" data-state="VENCIDA">Vencida</button>
            <button class="filter-pill" data-state="ANULADA">Anulada</button>
          </div>

          <div class="search-box-wrapper">
            <span class="search-icon-inside">🔍</span>
            <input type="text" id="invoice-search-input" class="search-input" placeholder="Buscar por número o tercero...">
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
                <th>Vencimiento</th>
                <th>Base Gravable</th>
                <th>IVA (19%)</th>
                <th>Total a Pagar</th>
                <th>Estado DIAN</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody id="invoices-table-body">
              <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
                  ⏳ Consultando comprobantes fiscales en la base de datos de ${state.currentTenant.name}...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modal de Detalle de Factura DIAN -->
        <div id="invoice-modal-backdrop" class="invoice-modal-backdrop">
          <div class="invoice-modal-card" id="invoice-modal-content"></div>
        </div>
      </div>
    `;

    this.bindStaticEvents();
  }

  static async loadFacturas() {
    try {
      const res = await ApiClient.listFacturas();
      if (res.success && Array.isArray(res.data)) {
        this.facturas = res.data;
        this.renderTableRows();
      }
    } catch (err) {
      const tbody = document.getElementById('invoices-table-body');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 40px; color: #dc2626;">
              ❌ Error al consultar las facturas de la empresa: ${err.message}
            </td>
          </tr>
        `;
      }
    }
  }

  static renderTableRows() {
    const tbody = document.getElementById('invoices-table-body');
    if (!tbody) return;

    let filtered = [...this.facturas];

    if (this.filterState !== 'TODAS') {
      filtered = filtered.filter((f) => f.estadoDian === this.filterState);
    }

    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.numeroCompleto.toLowerCase().includes(term) ||
          f.clienteNombre.toLowerCase().includes(term) ||
          f.clienteNit.toLowerCase().includes(term)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
            No se encontraron comprobantes fiscales con los criterios seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((f) => {
        const badgeClass = this.getBadgeClass(f.estadoDian);
        const badgeLabel = this.getBadgeLabel(f.estadoDian);

        const fechaEmision = f.fechaEmision ? f.fechaEmision.split('T')[0] : '2026-10-01';
        const fechaVence = f.fechaVencimiento ? f.fechaVencimiento.split('T')[0] : '2026-10-31';

        return `
          <tr>
            <td>
              <a href="#" class="invoice-number-link" data-id="${f.id}">${f.numeroCompleto}</a>
            </td>
            <td>
              <span class="client-name-cell">${f.clienteNombre}</span>
              <span class="client-nit-cell">${f.clienteNit}</span>
            </td>
            <td style="color: #64748b;">${fechaEmision}</td>
            <td style="color: #64748b;">${fechaVence}</td>
            <td class="amount-cell">$ ${Number(f.baseGravable).toLocaleString('es-CO')}</td>
            <td class="amount-iva">$ ${Number(f.totalIva).toLocaleString('es-CO')}</td>
            <td class="amount-total">$ ${Number(f.totalPagar).toLocaleString('es-CO')}</td>
            <td>
              <span class="badge ${badgeClass}">${badgeLabel}</span>
            </td>
            <td>
              <button type="button" class="btn-table-action btn-view-invoice" data-id="${f.id}">Ver</button>
            </td>
          </tr>
        `;
      })
      .join('');

    // Bindeo de clicks para abrir modal
    tbody.querySelectorAll('.invoice-number-link, .btn-view-invoice').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const id = el.getAttribute('data-id');
        this.openInvoiceDetail(id);
      });
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
        return estado;
    }
  }

  static bindStaticEvents() {
    // Filtros de Estado
    const pillsContainer = document.getElementById('filter-pills-container');
    if (pillsContainer) {
      pillsContainer.querySelectorAll('.filter-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          pillsContainer.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.filterState = btn.getAttribute('data-state');
          this.renderTableRows();
        });
      });
    }

    // Buscador
    const searchInput = document.getElementById('invoice-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.renderTableRows();
      });
    }

    // Acciones auxiliares
    const btnXml = document.getElementById('btn-export-xml');
    if (btnXml) {
      btnXml.addEventListener('click', () => {
        alert('En entorno de desarrollo: Paquete ZIP con XMLs UBL 2.1 firmado electrónicamente.');
      });
    }

    const btnNueva = document.getElementById('btn-nueva-factura');
    if (btnNueva) {
      btnNueva.addEventListener('click', () => {
        state.setModule('pos');
        state.setView('pos');
      });
    }
  }

  static openInvoiceDetail(invoiceId) {
    const factura = this.facturas.find((f) => f.id === invoiceId);
    if (!factura) return;

    const modalBackdrop = document.getElementById('invoice-modal-backdrop');
    const modalContent = document.getElementById('invoice-modal-content');

    const badgeClass = this.getBadgeClass(factura.estadoDian);
    const badgeLabel = this.getBadgeLabel(factura.estadoDian);

    modalContent.innerHTML = `
      <button class="modal-close-btn" id="modal-close-btn">✕</button>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a;">${factura.numeroCompleto}</h2>
          <p style="font-size: 12px; color: #64748b;">Factura Electrónica de Venta — DIAN Colombia</p>
        </div>
        <span class="badge ${badgeClass}" style="font-size: 13px; padding: 6px 14px;">${badgeLabel}</span>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
          <div>
            <span style="color: #64748b; font-size: 11px; display: block;">EMISOR (TENANT)</span>
            <b style="color: #0f172a;">${state.currentTenant.name}</b>
            <div style="color: #64748b; font-size: 12px;">${state.currentTenant.nit}</div>
          </div>
          <div>
            <span style="color: #64748b; font-size: 11px; display: block;">ADQUIRENTE / CLIENTE</span>
            <b style="color: #0f172a;">${factura.clienteNombre}</b>
            <div style="color: #64748b; font-size: 12px;">${factura.clienteNit}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 24px; font-size: 12px; font-family: monospace; background: #0f172a; color: #94a3b8; padding: 12px; border-radius: 8px; word-break: break-all;">
        <div style="color: #38bdf8; font-weight: bold; margin-bottom: 4px;">CUFE (Código Único de Factura Electrónica):</div>
        ${factura.cufe || 'CUFE-2026-DIAN-HASH-VALIDADO-SHA384-901445772'}
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
          <span style="color: #64748b;">Subtotal / Base Gravable:</span>
          <b>$ ${Number(factura.baseGravable).toLocaleString('es-CO')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
          <span style="color: #2563eb;">Total IVA (19%):</span>
          <b style="color: #2563eb;">$ ${Number(factura.totalIva).toLocaleString('es-CO')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 10px;">
          <span>Total Pagado:</span>
          <span style="color: #059669;">$ ${Number(factura.totalPagar).toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button class="btn-secondary" id="modal-download-pdf">Descargar PDF Fiscal</button>
        <button class="btn-primary" id="modal-close-action">Cerrar</button>
      </div>
    `;

    modalBackdrop.classList.add('open');

    document.getElementById('modal-close-btn').addEventListener('click', () => {
      modalBackdrop.classList.remove('open');
    });

    document.getElementById('modal-close-action').addEventListener('click', () => {
      modalBackdrop.classList.remove('open');
    });

    document.getElementById('modal-download-pdf').addEventListener('click', () => {
      alert(`Generando representación gráfica PDF para ${factura.numeroCompleto}...`);
    });
  }
}
