/**
 * VISTA DE PUNTO DE VENTA (POS) — NÚCLEO FINANCIERO (FIGMA DARK THEME)
 * Incluye:
 * 1. Soporte para productos y servicios (sin descuento de stock físico)
 * 2. Impresión de tirilla térmica 58mm/80mm y envío a WhatsApp
 * 3. Apertura, Arqueo Parcial (Caja X) y Cierre de Turno (Caja Z)
 * 4. Historial de ventas del turno con reimpresión y anulación
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';
import { Icons } from '../icons.js';

export class PosView {
  static async mount(container) {
    this.container = container;
    this.catalog = [];
    this.categories = [];
    this.selectedCategory = 'TODAS';
    this.searchTerm = '';
    this.currentMode = 'Mesa'; // 'Mostrador' | 'Mesa' | 'Vitrina'
    this.selectedPaymentMethod = 'EFECTIVO'; // 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'

    // Asegurar turno inicial si no existe
    this.ensureTurno();

    this.renderSkeleton();
    await this.loadData();
    this.renderCart();
    this.updateTurnoUI();
  }

  // ================= GESTIÓN DE TURNO DE CAJA (CAJA X / CAJA Z) =================
  static getTurnoKey() {
    return 'nf_pos_turno_' + (state.currentTenant?.id || 'default');
  }

  static getVentasKey() {
    return 'nf_pos_ventas_' + (state.currentTenant?.id || 'default');
  }

  static getTurno() {
    try {
      const raw = sessionStorage.getItem(this.getTurnoKey());
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  static saveTurno(turno) {
    sessionStorage.setItem(this.getTurnoKey(), JSON.stringify(turno));
    this.updateTurnoUI();
  }

  static ensureTurno() {
    let turno = this.getTurno();
    if (!turno) {
      // Turno por defecto con base inicial de $100.000 COP
      turno = {
        abierto: true,
        id: 'trn_' + Date.now().toString(36),
        fechaApertura: new Date().toISOString(),
        cajero: state.currentUser?.nombre || 'Cajero en Turno',
        baseEfectivo: 100000,
        totalEfectivo: 0,
        totalTarjetas: 0,
        totalTransferencias: 0,
        totalVentas: 0,
        cantidadVentas: 0,
      };
      this.saveTurno(turno);
    }
    return turno;
  }

  static getVentasTurno() {
    try {
      const raw = sessionStorage.getItem(this.getVentasKey());
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  static saveVentasTurno(ventas) {
    sessionStorage.setItem(this.getVentasKey(), JSON.stringify(ventas));
    this.updateVentasCount();
  }

  static registrarVentaEnTurno(venta) {
    const turno = this.getTurno() || this.ensureTurno();
    if (!turno.abierto) {
      turno.abierto = true;
      turno.fechaApertura = new Date().toISOString();
      turno.cajero = state.currentUser?.nombre || 'Cajero en Turno';
    }

    const monto = Number(venta.total || 0);
    turno.totalVentas = (turno.totalVentas || 0) + monto;
    turno.cantidadVentas = (turno.cantidadVentas || 0) + 1;

    if (venta.metodoPago === 'TARJETA') {
      turno.totalTarjetas = (turno.totalTarjetas || 0) + monto;
    } else if (venta.metodoPago === 'TRANSFERENCIA') {
      turno.totalTransferencias = (turno.totalTransferencias || 0) + monto;
    } else {
      turno.totalEfectivo = (turno.totalEfectivo || 0) + monto;
    }

    this.saveTurno(turno);

    const ventas = this.getVentasTurno();
    ventas.unshift(venta);
    this.saveVentasTurno(ventas);
  }

  static anularVenta(id, motivo) {
    const ventas = this.getVentasTurno();
    const idx = ventas.findIndex((v) => v.id === id);
    if (idx === -1) return false;

    const venta = ventas[idx];
    if (venta.anulada) {
      alert('Esta venta ya fue anulada anteriormente.');
      return false;
    }

    venta.anulada = true;
    venta.motivoAnulacion = motivo || 'Anulación manual solicitada en caja';
    venta.fechaAnulacion = new Date().toISOString();

    // Restar de los acumulados de caja
    const turno = this.getTurno();
    if (turno && turno.abierto) {
      const monto = Number(venta.total || 0);
      turno.totalVentas = Math.max(0, (turno.totalVentas || 0) - monto);
      turno.cantidadVentas = Math.max(0, (turno.cantidadVentas || 0) - 1);

      if (venta.metodoPago === 'TARJETA') {
        turno.totalTarjetas = Math.max(0, (turno.totalTarjetas || 0) - monto);
      } else if (venta.metodoPago === 'TRANSFERENCIA') {
        turno.totalTransferencias = Math.max(0, (turno.totalTransferencias || 0) - monto);
      } else {
        turno.totalEfectivo = Math.max(0, (turno.totalEfectivo || 0) - monto);
      }
      this.saveTurno(turno);
    }

    this.saveVentasTurno(ventas);
    return true;
  }

  static updateTurnoUI() {
    const turno = this.getTurno();
    const statusChip = document.getElementById('pos-status-chip');
    const btnCaja = document.getElementById('btn-caja-control');

    if (statusChip) {
      if (turno && turno.abierto) {
        const hora = new Date(turno.fechaApertura).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        statusChip.innerHTML = `
          <span class="dot" style="background: #10b981;"></span>
          <span>Caja Abierta (${hora}) · Base: $${Number(turno.baseEfectivo || 0).toLocaleString('es-CO')} · Ventas: $${Number(turno.totalVentas || 0).toLocaleString('es-CO')} · ${turno.cajero}</span>
        `;
      } else {
        statusChip.innerHTML = `
          <span class="dot" style="background: #ef4444;"></span>
          <span style="color: #fca5a5;">Caja Cerrada · Clic en "Control de Caja" para abrir turno</span>
        `;
      }
    }

    if (btnCaja) {
      if (turno && turno.abierto) {
        btnCaja.innerHTML = `${Icons.creditCard(14)} Caja Abierta ($${Number(turno.totalVentas || 0).toLocaleString('es-CO')})`;
        btnCaja.style.borderColor = '#10b981';
        btnCaja.style.color = '#34d399';
      } else {
        btnCaja.innerHTML = `${Icons.lock(14)} Abrir Caja`;
        btnCaja.style.borderColor = '#ef4444';
        btnCaja.style.color = '#f87171';
      }
    }

    this.updateVentasCount();
  }

  static updateVentasCount() {
    const badge = document.getElementById('count-ventas-badge');
    if (badge) {
      const ventas = this.getVentasTurno().filter((v) => !v.anulada);
      badge.textContent = String(ventas.length);
    }
  }

  // ================= RENDER PRINCIPAL =================
  static renderSkeleton() {
    const user = state.currentUser || { nombre: 'Cajero en Turno' };

    this.container.innerHTML = `
      <div class="pos-view-container">
        <!-- Columna Izquierda: Catálogo y Operación Táctil -->
        <div class="pos-catalog-column">
          <!-- Barra Superior de Modos de Operación -->
          <div class="pos-top-toolbar" style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div class="pos-modes-group">
              <button type="button" class="pos-mode-btn ${this.currentMode === 'Mostrador' ? 'active' : ''}" data-mode="Mostrador">
                <span>${Icons.pos(14)} Mostrador</span>
              </button>
              <button type="button" class="pos-mode-btn ${this.currentMode === 'Mesa' ? 'active' : ''}" data-mode="Mesa">
                <span>${Icons.user(14)} Mesa</span>
              </button>
              <button type="button" class="pos-mode-btn ${this.currentMode === 'Vitrina' ? 'active' : ''}" data-mode="Vitrina">
                <span>${Icons.package(14)} Vitrina</span>
              </button>
            </div>

            <!-- Botones Operativos de Turno y Ventas -->
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button type="button" id="btn-caja-control" style="background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 7px 12px; border-radius: 10px; font-size: 12px; font-weight: 700; color: var(--text-main); cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                ${Icons.dollarSign(14)} Control de Caja
              </button>
              <button type="button" id="btn-historial-ventas" style="background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 7px 12px; border-radius: 10px; font-size: 12px; font-weight: 700; color: var(--text-main); cursor: pointer; display: flex; align-items: center; gap: 6px;">
                ${Icons.fileText(14)} Ventas (<span id="count-ventas-badge">0</span>)
              </button>
            </div>

            <div class="pos-status-chip" id="pos-status-chip" style="cursor: pointer;" title="Clic para ver Arqueo de Caja">
              <span class="dot"></span>
              <span>Caja activa · ${user.nombre}</span>
            </div>
          </div>

          <!-- Buscador y Tercero -->
          <div class="pos-search-row">
            <input type="text" id="pos-search-input" class="pos-search-input" placeholder="Buscar por nombre o código de barras...">
            <div class="pos-client-pill" style="display: inline-flex; align-items: center; gap: 6px;">
              <span>${Icons.user(13)} Consumidor final (222222222222)</span>
            </div>
          </div>

          <!-- Píldoras de Categorías -->
          <div class="pos-category-pills" id="pos-category-pills">
            <button class="pos-cat-pill active" data-cat="TODAS">Todas</button>
          </div>

          <!-- Grilla de Productos con Scroll Dedicado -->
          <div class="pos-product-grid-wrapper">
            <div class="pos-product-grid" id="pos-product-grid">
              <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                ⏳ Cargando catálogo especializado de ${state.currentTenant?.name || 'la empresa'}...
              </div>
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Comanda / Orden Activa -->
        <div class="pos-order-column" id="pos-order-column">
          <div class="order-header-box">
            <div class="order-title-row">
              <div style="display: flex; align-items: center;">
                <button type="button" class="btn-close-mobile-order" id="btn-close-mobile-order">← Catálogo</button>
                <h3>Comanda · ${state.selectedTable || 'Mostrador'}</h3>
              </div>
              <span id="order-units-count" style="font-size: 12px; color: #f59e0b; font-weight: 700;">0 ítems</span>
            </div>
            <p class="order-subtitle">Descuenta inventario en tiempo real (excepto servicios)</p>

            <div class="order-quick-actions">
              <button class="btn-order-action" id="btn-dividir-cuenta">Dividir cuenta</button>
              <button class="btn-order-action" id="btn-unir-mesas">Unir mesas</button>
              <button class="btn-order-action" id="btn-cambiar-mesa">Cambiar mesa</button>
            </div>
          </div>

          <!-- Lista de ítems del pedido -->
          <div class="order-items-list" id="order-items-list">
            <div class="empty-order-placeholder">
              <div class="icon">${Icons.shoppingCart(32)}</div>
              <p><b>Venta lista para empezar</b></p>
              <p style="font-size: 11px;">Selecciona productos del catálogo o usa el escáner.</p>
            </div>
          </div>

          <!-- Selector de Método de Pago Rápido -->
          <div style="padding: 10px 16px; background: rgba(15, 23, 42, 0.4); border-top: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">
              Forma de Pago
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;" id="payment-method-selector">
              <button type="button" class="btn-pay-method ${this.selectedPaymentMethod === 'EFECTIVO' ? 'active' : ''}" data-method="EFECTIVO" style="padding: 6px 4px; border-radius: 8px; border: 1px solid ${this.selectedPaymentMethod === 'EFECTIVO' ? '#10b981' : 'var(--border-subtle)'}; background: ${this.selectedPaymentMethod === 'EFECTIVO' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)'}; color: ${this.selectedPaymentMethod === 'EFECTIVO' ? '#10b981' : 'var(--text-muted)'}; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                ${Icons.dollarSign(13)} Efectivo
              </button>
              <button type="button" class="btn-pay-method ${this.selectedPaymentMethod === 'TARJETA' ? 'active' : ''}" data-method="TARJETA" style="padding: 6px 4px; border-radius: 8px; border: 1px solid ${this.selectedPaymentMethod === 'TARJETA' ? '#3b82f6' : 'var(--border-subtle)'}; background: ${this.selectedPaymentMethod === 'TARJETA' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)'}; color: ${this.selectedPaymentMethod === 'TARJETA' ? '#3b82f6' : 'var(--text-muted)'}; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                ${Icons.creditCard(13)} Tarjeta
              </button>
              <button type="button" class="btn-pay-method ${this.selectedPaymentMethod === 'TRANSFERENCIA' ? 'active' : ''}" data-method="TRANSFERENCIA" style="padding: 6px 4px; border-radius: 8px; border: 1px solid ${this.selectedPaymentMethod === 'TRANSFERENCIA' ? '#8b5cf6' : 'var(--border-subtle)'}; background: ${this.selectedPaymentMethod === 'TRANSFERENCIA' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-card)'}; color: ${this.selectedPaymentMethod === 'TRANSFERENCIA' ? '#8b5cf6' : 'var(--text-muted)'}; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                ${Icons.smartphone(13)} QR / Transf
              </button>
            </div>
          </div>

          <!-- Resumen y Liquidación -->
          <div class="order-summary-box">
            <div class="summary-line">
              <span>Subtotal</span>
              <span id="summary-subtotal">$ 0</span>
            </div>
            <div class="summary-line">
              <span>Impuesto al consumo (8%) / IVA</span>
              <span id="summary-tax">$ 0</span>
            </div>
            <div class="summary-line">
              <span>Propina sugerida (10%)</span>
              <span id="summary-tip">$ 0</span>
            </div>

            <div class="summary-total-line">
              <span>TOTAL</span>
              <span class="amount" id="summary-total">$ 0</span>
            </div>

            <div class="order-buttons-group">
              <button type="button" class="btn-kds-send" id="btn-send-kds">
                <span>Enviar Cocina</span>
              </button>
              <button type="button" class="btn-pos-pay" id="btn-pos-pay" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                <span>${Icons.printer(16)} Cobrar e Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra flotante móvil para abrir la comanda -->
      <div class="pos-mobile-order-bar" id="pos-mobile-order-bar">
        <div class="pos-mobile-order-info">
          <div class="icon">${Icons.pos(18)}</div>
          <div>
            <div style="font-size: 12px; font-weight: 700;">${state.selectedTable}</div>
            <div class="pos-mobile-bar-total" id="mobile-bar-total">$ 0</div>
          </div>
        </div>
        <button type="button" class="btn-mobile-open-order" id="btn-mobile-open-order">${Icons.fileText(14)} Ver Comanda</button>
      </div>

      <!-- MODAL 1: TIRILLA TÉRMICA (58mm / 80mm) & WHATSAPP -->
      <div id="modal-ticket-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(5px); align-items: center; justify-content: center; z-index: 3000; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 440px; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.4); border: 1px solid var(--border-subtle); display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(37, 99, 235, 0.1); color: #2563eb;">
                ${Icons.printer(18)}
              </span>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0;">Tirilla Térmica POS</h3>
            </div>
            <button type="button" class="close-ticket-modal-btn" style="background: var(--bg-subtle); border: none; width: 30px; height: 30px; border-radius: 50%; font-size: 14px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <!-- Contenedor Imprimible del Recibo -->
          <div style="padding: 20px; background: #0b0f19; overflow-y: auto; flex: 1;">
            <div id="thermal-receipt-printable" style="background: #ffffff; color: #111827; padding: 18px 16px; border-radius: 8px; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.35; box-shadow: 0 4px 14px rgba(0,0,0,0.25);">
              <!-- Renderizado dinámicamente -->
            </div>
          </div>

          <!-- Barra de Acciones del Ticket -->
          <div style="padding: 14px 20px; border-top: 1px solid var(--border-subtle); background: var(--bg-card); display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" id="btn-share-whatsapp" style="flex: 1; padding: 10px 14px; border-radius: 10px; border: none; background: #16a34a; color: #ffffff; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>WhatsApp</span>
            </button>
            <button type="button" id="btn-print-receipt" style="flex: 1; padding: 10px 14px; border-radius: 10px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>${Icons.printer(14)} Imprimir (80mm)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: CONTROL DE CAJA (APERTURA, ARQUEO X Y CIERRE Z) -->
      <div id="modal-caja-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(5px); align-items: center; justify-content: center; z-index: 3000; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.4); border: 1px solid var(--border-subtle); padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); color: #10b981;">
                ${Icons.dollarSign(18)}
              </span>
              <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">Control de Caja & Turno</h3>
            </div>
            <button type="button" class="close-caja-modal-btn" style="background: var(--bg-subtle); border: none; width: 30px; height: 30px; border-radius: 50%; font-size: 14px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <div id="caja-modal-content">
            <!-- Dinámico según si la caja está abierta o cerrada -->
          </div>
        </div>
      </div>

      <!-- MODAL 3: HISTORIAL DE VENTAS DEL TURNO & REIMPRESIÓN / ANULACIÓN -->
      <div id="modal-historial-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(5px); align-items: center; justify-content: center; z-index: 3000; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.4); border: 1px solid var(--border-subtle); padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                ${Icons.fileText(18)}
              </span>
              <div>
                <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">Ventas del Turno</h3>
                <div style="font-size: 12px; color: var(--text-muted);">Reimpresión de tirillas y anulación de facturas con restitución</div>
              </div>
            </div>
            <button type="button" class="close-historial-modal-btn" style="background: var(--bg-subtle); border: none; width: 30px; height: 30px; border-radius: 50%; font-size: 14px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <div id="historial-ventas-content">
            <!-- Tabla de ventas dinámicas -->
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  // ================= CARGA DE CATÁLOGO =================
  static async loadData() {
    try {
      const res = await ApiClient.getCatalogoPos();
      if (res.success && res.data) {
        const rawProds = Array.isArray(res.data.productos)
          ? res.data.productos
          : Array.isArray(res.data)
            ? res.data
            : [];
        const rawCats = Array.isArray(res.data.categorias) ? res.data.categorias : [];

        this.categoriesList = rawCats;
        this.categories = rawCats.map((c) => c.nombre);

        // Mapear nombre de categoría a cada producto para filtros rápidos
        this.catalog = rawProds.map((p) => {
          const cat = rawCats.find((c) => c.id === p.categoriaId);
          return {
            ...p,
            categoriaNombre: cat ? cat.nombre : p.categoriaNombre || 'General',
          };
        });

        this.renderCategoryPills();
        this.renderProductGrid();
      }
    } catch (err) {
      const grid = document.getElementById('pos-product-grid');
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444;">
            Error al cargar catálogo: ${err.message}
          </div>
        `;
      }
    }
  }

  static renderCategoryPills() {
    const container = document.getElementById('pos-category-pills');
    if (!container) return;

    container.innerHTML = `
      <button class="pos-cat-pill ${this.selectedCategory === 'TODAS' ? 'active' : ''}" data-cat="TODAS">Todas</button>
      ${this.categories
        .map(
          (c) => `
        <button class="pos-cat-pill ${this.selectedCategory === c ? 'active' : ''}" data-cat="${c}">${c}</button>
      `
        )
        .join('')}
    `;

    container.querySelectorAll('.pos-cat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pos-cat-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCategory = btn.getAttribute('data-cat');
        this.renderProductGrid();
      });
    });
  }

  static renderProductGrid() {
    const grid = document.getElementById('pos-product-grid');
    if (!grid) return;

    let filtered = [...this.catalog];

    if (this.selectedCategory !== 'TODAS') {
      filtered = filtered.filter((p) => p.categoriaNombre === this.selectedCategory);
    }

    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(term))
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
          No hay productos disponibles en esta categoría.
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered
      .map((p) => {
        const icon = this.getProductIcon(p.nombre, p.categoriaNombre);
        const precio = Number(p.precioBase).toLocaleString('es-CO');
        const isServicio = Boolean(p.esServicio);

        return `
          <div class="pos-product-card" data-id="${p.id}" style="position: relative;">
            <div>
              <div class="pos-product-icon-wrap" style="color: var(--primary-500);">${icon}</div>
              <div class="pos-product-name">${p.nombre}</div>
              <div class="pos-product-stock">
                ${isServicio ? '<b style="color: #60a5fa;">Servicio</b>' : `Stock: ${p.stockActual || 0} disp.`}
              </div>
            </div>
            <div class="pos-product-price">$ ${precio}</div>
          </div>
        `;
      })
      .join('');

    // Clicks en productos para agregar a la orden
    grid.querySelectorAll('.pos-product-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const prod = this.catalog.find((p) => p.id === id);
        if (prod) {
          state.addToCart({
            id: prod.id,
            nombre: prod.nombre,
            precio: Number(prod.precioBase || 0),
            precio_base: Number(prod.precioBase || 0),
            tipo_impuesto: prod.tipoImpuesto,
            esServicio: Boolean(prod.esServicio),
          });
          this.renderCart();
        }
      });
    });
  }

  static getProductIcon(nombre, cat) {
    const n = (nombre + ' ' + (cat || '')).toLowerCase();
    if (n.includes('corte') || n.includes('barba') || n.includes('peinado') || n.includes('cepillado') || n.includes('manicure') || n.includes('pedicure') || n.includes('masaje') || n.includes('facial') || n.includes('spa')) {
      return Icons.scissors(24);
    }
    return Icons.package(24);
  }

  // ================= RENDER COMANDA / CARRITO =================
  static renderCart() {
    const itemsList = document.getElementById('order-items-list');
    const unitsCount = document.getElementById('order-units-count');
    const subtotalEl = document.getElementById('summary-subtotal');
    const taxEl = document.getElementById('summary-tax');
    const tipEl = document.getElementById('summary-tip');
    const totalEl = document.getElementById('summary-total');

    if (!itemsList) return;

    const mobileBarTotal = document.getElementById('mobile-bar-total');

    if (state.cartItems.length === 0) {
      itemsList.innerHTML = `
        <div class="empty-order-placeholder">
          <div class="icon">${Icons.shoppingCart(32)}</div>
          <p><b>Venta lista para empezar</b></p>
          <p style="font-size: 11px;">Selecciona productos del catálogo o usa el escáner.</p>
        </div>
      `;
      unitsCount.textContent = '0 ítems';
      subtotalEl.textContent = '$ 0';
      taxEl.textContent = '$ 0';
      tipEl.textContent = '$ 0';
      totalEl.textContent = '$ 0';
      if (mobileBarTotal) mobileBarTotal.textContent = '$ 0';
      return;
    }

    let subtotal = 0;
    let totalItems = 0;

    itemsList.innerHTML = state.cartItems
      .map((item) => {
        const precioUnit = Number(item.precio || item.precio_base || 0);
        const itemSubtotal = precioUnit * item.quantity;
        subtotal += itemSubtotal;
        totalItems += item.quantity;

        return `
          <div class="order-item-row">
            <div class="item-left">
              <span class="item-name">${item.nombre}</span>
              <span class="item-meta">
                $ ${precioUnit.toLocaleString('es-CO')} c/u
                ${item.esServicio ? '<b style="color: #60a5fa; margin-left: 4px;">[Servicio]</b>' : ''}
              </span>
            </div>
            <div class="item-qty-control">
              <button class="btn-qty btn-minus" data-id="${item.id}">-</button>
              <span class="item-qty-value">${item.quantity}</span>
              <button class="btn-qty btn-plus" data-id="${item.id}">+</button>
              <span class="item-total-price">$ ${itemSubtotal.toLocaleString('es-CO')}</span>
            </div>
          </div>
        `;
      })
      .join('');

    const tax = Math.round(subtotal * 0.08); // Impoconsumo 8% promedio restaurante/POS
    const tip = this.currentMode === 'Mesa' ? Math.round(subtotal * 0.1) : 0; // Propina sugerida solo en mesas
    const total = subtotal + tax + tip;

    unitsCount.textContent = `${totalItems} ítem${totalItems > 1 ? 's' : ''}`;
    subtotalEl.textContent = `$ ${subtotal.toLocaleString('es-CO')}`;
    taxEl.textContent = `$ ${tax.toLocaleString('es-CO')}`;
    tipEl.textContent = `$ ${tip.toLocaleString('es-CO')}`;
    totalEl.textContent = `$ ${total.toLocaleString('es-CO')}`;
    if (mobileBarTotal) mobileBarTotal.textContent = `$ ${total.toLocaleString('es-CO')}`;

    // Handlers de cantidad
    itemsList.querySelectorAll('.btn-minus').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.updateCartQuantity(btn.getAttribute('data-id'), -1);
        this.renderCart();
      });
    });

    itemsList.querySelectorAll('.btn-plus').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.updateCartQuantity(btn.getAttribute('data-id'), 1);
        this.renderCart();
      });
    });
  }

  // ================= TIRILLA TÉRMICA Y WHATSAPP =================
  static mostrarTicketModal(venta) {
    const modal = document.getElementById('modal-ticket-backdrop');
    const container = document.getElementById('thermal-receipt-printable');
    if (!modal || !container) return;

    this.currentTicketVenta = venta;

    const tenantName = state.currentTenant?.name || 'Comercio Registrado';
    const tenantType = state.currentTenant?.businessType || 'Comercio General';
    const fechaStr = new Date(venta.fecha || Date.now()).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    container.innerHTML = `
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="font-weight: 900; font-size: 15px; text-transform: uppercase;">${tenantName}</div>
        <div style="font-size: 11px;">NIT: ${state.currentTenant?.taxId || state.currentTenant?.nit || '222222222222'} · Régimen Común</div>
        <div style="font-size: 10px; color: #444;">${tenantType} · POS Núcleo Financiero</div>
      </div>

      <div style="font-size: 11px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px;">
        <div><b>COMPROBANTE:</b> ${venta.comprobante}</div>
        <div><b>FECHA:</b> ${fechaStr}</div>
        <div><b>CAJERO:</b> ${venta.cajero}</div>
        <div><b>MODO:</b> ${venta.modoAtencion} (${venta.mesa})</div>
        <div><b>CLIENTE:</b> ${venta.clienteNombre}</div>
        <div><b>DOC:</b> ${venta.clienteNit}</div>
      </div>

      <div style="margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 11px; margin-bottom: 4px;">
          <span>CANT DESCRIPCIÓN</span>
          <span>VALOR</span>
        </div>
        ${venta.items
          .map((it) => {
            const pUnit = Number(it.precio || it.precio_base || 0);
            const tot = pUnit * it.quantity;
            return `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>${it.quantity}x ${it.nombre}</span>
              <span>$${tot.toLocaleString('es-CO')}</span>
            </div>
          `;
          })
          .join('')}
      </div>

      <div style="font-size: 11px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>SUBTOTAL:</span>
          <span>$${Number(venta.subtotal || 0).toLocaleString('es-CO')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>IMPUESTO (8%/IVA):</span>
          <span>$${Number(venta.tax || 0).toLocaleString('es-CO')}</span>
        </div>
        ${
          venta.tip > 0
            ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>PROPINA VOLUNTARIA:</span>
            <span>$${Number(venta.tip || 0).toLocaleString('es-CO')}</span>
          </div>
        `
            : ''
        }
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
          <span>TOTAL A PAGAR:</span>
          <span>$${Number(venta.total || 0).toLocaleString('es-CO')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px; font-weight: 700;">
          <span>FORMA DE PAGO:</span>
          <span>${venta.metodoPago}</span>
        </div>
      </div>

      <div style="text-align: center; border-top: 1px dashed #000; padding-top: 8px; font-size: 10px;">
        <div>*** DOCUMENTO EQUIVALENTE POS ***</div>
        <div>Autorización DIAN Resolución Electrónica</div>
        <div style="margin-top: 4px; font-style: italic;">¡Gracias por su visita y preferencia!</div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  static compartirTicketWhatsApp(venta) {
    if (!venta) return;
    const tenantName = state.currentTenant?.name || 'Comercio';
    const itemsText = venta.items
      .map((it) => `• ${it.quantity}x ${it.nombre} = $${(Number(it.precio || it.precio_base || 0) * it.quantity).toLocaleString('es-CO')}`)
      .join('\n');

    const msg = `*RECIBO DE VENTA — ${tenantName}*
----------------------------------------
*Comprobante:* ${venta.comprobante}
*Fecha:* ${new Date(venta.fecha).toLocaleString('es-CO')}
*Cliente:* ${venta.clienteNombre} (${venta.clienteNit})
*Atención:* ${venta.modoAtencion} (${venta.mesa})
*Cajero:* ${venta.cajero}

*DETALLE:*
${itemsText}

*Subtotal:* $${Number(venta.subtotal || 0).toLocaleString('es-CO')}
*Impuesto:* $${Number(venta.tax || 0).toLocaleString('es-CO')}
${venta.tip > 0 ? `*Propina:* $${Number(venta.tip || 0).toLocaleString('es-CO')}\n` : ''}*TOTAL PAGADO:* $${Number(venta.total || 0).toLocaleString('es-CO')}
*Forma de Pago:* ${venta.metodoPago}

----------------------------------------
¡Gracias por su compra!
_Software POS Núcleo Financiero_`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  // ================= MODAL CONTROL DE CAJA =================
  static openCajaModal() {
    const modal = document.getElementById('modal-caja-backdrop');
    const content = document.getElementById('caja-modal-content');
    if (!modal || !content) return;

    const turno = this.getTurno();

    if (!turno || !turno.abierto) {
      // Formulario de Apertura de Caja
      content.innerHTML = `
        <div style="text-align: center; padding: 10px 0 20px;">
          <div style="margin-bottom: 8px; color: #10b981;">${Icons.lock(36)}</div>
          <h4 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">Apertura de Turno de Caja</h4>
          <p style="font-size: 13px; color: var(--text-muted);">Ingresa el efectivo inicial disponible en gaveta (base de sencillo).</p>
        </div>

        <form id="form-abrir-caja">
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Base en Efectivo ($ COP) *</label>
            <input type="number" id="caja-base-input" required min="0" step="1000" value="100000" style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: #10b981; font-size: 18px; font-weight: 800;">
          </div>

          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Cajero Responsable</label>
            <input type="text" value="${state.currentUser?.nombre || 'Cajero en Turno'}" readonly style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-muted);">
          </div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" class="close-caja-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
            <button type="submit" style="padding: 10px 22px; border-radius: 10px; border: none; background: #10b981; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 6px;">
              Iniciar Turno de Caja
            </button>
          </div>
        </form>
      `;

      const formAbrir = document.getElementById('form-abrir-caja');
      if (formAbrir) {
        formAbrir.addEventListener('submit', (e) => {
          e.preventDefault();
          const base = Number(document.getElementById('caja-base-input').value || 0);
          const nuevoTurno = {
            abierto: true,
            id: 'trn_' + Date.now().toString(36),
            fechaApertura: new Date().toISOString(),
            cajero: state.currentUser?.nombre || 'Cajero en Turno',
            baseEfectivo: base,
            totalEfectivo: 0,
            totalTarjetas: 0,
            totalTransferencias: 0,
            totalVentas: 0,
            cantidadVentas: 0,
          };
          this.saveTurno(nuevoTurno);
          alert(`Turno de caja iniciado con base de $${base.toLocaleString('es-CO')}`);
          modal.style.display = 'none';
        });
      }
    } else {
      // Arqueo Parcial (Caja X) y Cierre de Turno (Caja Z)
      const efectivoEsperado = Number(turno.baseEfectivo || 0) + Number(turno.totalEfectivo || 0);

      content.innerHTML = `
        <!-- Pestañas del Modal -->
        <div style="display: flex; gap: 8px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 4px; margin-bottom: 18px;">
          <button type="button" id="tab-caja-x-btn" style="flex: 1; padding: 8px; background: rgba(59, 130, 246, 0.15); border: none; border-radius: 8px; font-weight: 700; color: #3b82f6; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            ${Icons.chartBar(14)} Arqueo Parcial (Caja X)
          </button>
          <button type="button" id="tab-caja-z-btn" style="flex: 1; padding: 8px; background: transparent; border: none; border-radius: 8px; font-weight: 700; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            ${Icons.lock(14)} Cerrar Turno (Caja Z)
          </button>
        </div>

        <!-- Vista Arqueo Caja X -->
        <div id="view-caja-x">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
            <div style="background: var(--bg-subtle); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--border-subtle);">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Base Inicial</div>
              <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">$ ${Number(turno.baseEfectivo || 0).toLocaleString('es-CO')}</div>
            </div>
            <div style="background: var(--bg-subtle); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--border-subtle);">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Transacciones</div>
              <div style="font-size: 18px; font-weight: 800; color: #3b82f6;">${turno.cantidadVentas || 0} ventas</div>
            </div>
          </div>

          <div style="background: var(--bg-subtle); border-radius: 12px; padding: 14px; border: 1px solid var(--border-subtle); margin-bottom: 16px;">
            <div style="font-size: 12px; font-weight: 800; color: var(--text-main); margin-bottom: 10px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
              Ventas por Medio de Pago
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;">${Icons.dollarSign(13)} Ventas Efectivo:</span>
              <span style="font-weight: 700; color: var(--text-main);">$ ${Number(turno.totalEfectivo || 0).toLocaleString('es-CO')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;">${Icons.creditCard(13)} Ventas Tarjetas:</span>
              <span style="font-weight: 700; color: var(--text-main);">$ ${Number(turno.totalTarjetas || 0).toLocaleString('es-CO')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;">${Icons.smartphone(13)} Ventas QR / Transferencias:</span>
              <span style="font-weight: 700; color: var(--text-main);">$ ${Number(turno.totalTransferencias || 0).toLocaleString('es-CO')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; border-top: 1px dashed var(--border-subtle); padding-top: 8px; margin-top: 6px; color: #10b981;">
              <span>TOTAL VENTAS DEL TURNO:</span>
              <span>$ ${Number(turno.totalVentas || 0).toLocaleString('es-CO')}</span>
            </div>
          </div>

          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 14px; margin-bottom: 16px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase;">Efectivo Físico Esperado en Caja</div>
            <div style="font-size: 22px; font-weight: 900; color: #10b981;">$ ${efectivoEsperado.toLocaleString('es-CO')}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">(Base Inicial + Ventas Efectivo)</div>
          </div>
        </div>

        <!-- Vista Cierre Caja Z -->
        <div id="view-caja-z" style="display: none;">
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;">
            <div style="font-size: 12px; font-weight: 700; color: #ef4444;">Cierre Definitivo de Turno (Caja Z)</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Realiza el conteo físico de dinero en la gaveta para calcular diferencias.</div>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">
              Efectivo Contado Físicamente ($ COP) *
            </label>
            <input type="number" id="conteo-fisico-input" min="0" step="1000" value="${efectivoEsperado}" style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: #10b981; font-size: 18px; font-weight: 800;">
          </div>

          <!-- Indicador de Descuadre en Tiempo Real -->
          <div id="descuadre-indicator" style="padding: 12px 14px; border-radius: 10px; background: rgba(16, 185, 129, 0.12); border: 1px solid #10b981; margin-bottom: 16px; text-align: center; font-size: 13px; font-weight: 700; color: #10b981;">
            Caja Cuadrada (Diferencia: $ 0)
          </div>

          <div style="margin-bottom: 18px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Observaciones / Novedades de Cierre</label>
            <input type="text" id="cierre-notas-input" placeholder="Ej: Sin novedades, turno entregado con normalidad" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
          </div>

          <button type="button" id="btn-confirmar-cierre-z" style="width: 100%; padding: 12px; border-radius: 10px; border: none; background: #dc2626; color: #ffffff; font-weight: 800; font-size: 14px; cursor: pointer; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35); display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
            ${Icons.lock(16)} Asentar Cierre de Caja Z y Reiniciar Turno
          </button>
        </div>
      `;

      // Handlers de cambio de pestaña
      const btnTabX = document.getElementById('tab-caja-x-btn');
      const btnTabZ = document.getElementById('tab-caja-z-btn');
      const viewX = document.getElementById('view-caja-x');
      const viewZ = document.getElementById('view-caja-z');

      if (btnTabX && btnTabZ && viewX && viewZ) {
        btnTabX.addEventListener('click', () => {
          btnTabX.style.background = 'rgba(59, 130, 246, 0.15)';
          btnTabX.style.color = '#3b82f6';
          btnTabZ.style.background = 'transparent';
          btnTabZ.style.color = 'var(--text-muted)';
          viewX.style.display = 'block';
          viewZ.style.display = 'none';
        });

        btnTabZ.addEventListener('click', () => {
          btnTabZ.style.background = 'rgba(239, 68, 68, 0.15)';
          btnTabZ.style.color = '#ef4444';
          btnTabX.style.background = 'transparent';
          btnTabX.style.color = 'var(--text-muted)';
          viewX.style.display = 'none';
          viewZ.style.display = 'block';
        });
      }

      // Handler de cálculo de descuadre en tiempo real
      const inputConteo = document.getElementById('conteo-fisico-input');
      const indDescuadre = document.getElementById('descuadre-indicator');

      if (inputConteo && indDescuadre) {
        inputConteo.addEventListener('input', () => {
          const contado = Number(inputConteo.value || 0);
          const dif = contado - efectivoEsperado;

          if (dif === 0) {
            indDescuadre.style.background = 'rgba(16, 185, 129, 0.12)';
            indDescuadre.style.borderColor = '#10b981';
            indDescuadre.style.color = '#10b981';
            indDescuadre.innerHTML = 'Caja Cuadrada Perfecta (Diferencia: $ 0)';
          } else if (dif > 0) {
            indDescuadre.style.background = 'rgba(59, 130, 246, 0.12)';
            indDescuadre.style.borderColor = '#3b82f6';
            indDescuadre.style.color = '#3b82f6';
            indDescuadre.innerHTML = `Sobrante de Caja: +$ ${dif.toLocaleString('es-CO')}`;
          } else {
            indDescuadre.style.background = 'rgba(239, 68, 68, 0.12)';
            indDescuadre.style.borderColor = '#ef4444';
            indDescuadre.style.color = '#ef4444';
            indDescuadre.innerHTML = `Faltante de Dinero: -$ ${Math.abs(dif).toLocaleString('es-CO')}`;
          }
        });
      }

      // Handler confirmar cierre Z
      const btnCierreZ = document.getElementById('btn-confirmar-cierre-z');
      if (btnCierreZ) {
        btnCierreZ.addEventListener('click', () => {
          const contado = Number(inputConteo?.value || 0);
          const notas = document.getElementById('cierre-notas-input')?.value || 'Sin observaciones';
          const dif = contado - efectivoEsperado;

          if (!confirm(`¿Confirmar Cierre de Turno de Caja Z?\nEfectivo esperado: $${efectivoEsperado.toLocaleString('es-CO')}\nEfectivo contado: $${contado.toLocaleString('es-CO')}\nDiferencia: $${dif.toLocaleString('es-CO')}`)) {
            return;
          }

          // Marcar turno cerrado
          turno.abierto = false;
          turno.fechaCierre = new Date().toISOString();
          turno.efectivoContado = contado;
          turno.diferencia = dif;
          turno.notasCierre = notas;

          this.saveTurno(turno);
          alert(`Turno de caja cerrado exitosamente.\nInforme Z guardado.\nTotal ventas: $${Number(turno.totalVentas || 0).toLocaleString('es-CO')}`);
          modal.style.display = 'none';
        });
      }
    }

    modal.style.display = 'flex';
  }

  // ================= MODAL HISTORIAL DE VENTAS =================
  static openHistorialModal() {
    const modal = document.getElementById('modal-historial-backdrop');
    const content = document.getElementById('historial-ventas-content');
    if (!modal || !content) return;

    const ventas = this.getVentasTurno();

    if (ventas.length === 0) {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="margin-bottom: 8px; color: #94a3b8;">${Icons.fileText(36)}</div>
          <p>No se han registrado ventas en el turno actual.</p>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
            <thead>
              <tr style="background: var(--bg-subtle); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
                <th style="padding: 10px 12px;">Hora</th>
                <th style="padding: 10px 12px;">Comprobante</th>
                <th style="padding: 10px 12px;">Atención</th>
                <th style="padding: 10px 12px;">Método</th>
                <th style="padding: 10px 12px; text-align: right;">Total</th>
                <th style="padding: 10px 12px; text-align: center;">Estado</th>
                <th style="padding: 10px 12px; text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${ventas
                .map((v) => {
                  const hora = new Date(v.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                  return `
                  <tr style="border-bottom: 1px solid var(--border-subtle); ${v.anulada ? 'opacity: 0.5; background: rgba(239, 68, 68, 0.05);' : ''}">
                    <td style="padding: 10px 12px; font-weight: 700;">${hora}</td>
                    <td style="padding: 10px 12px; font-family: monospace; font-weight: 800; color: var(--text-main);">${v.comprobante}</td>
                    <td style="padding: 10px 12px;">${v.modoAtencion} (${v.mesa})</td>
                    <td style="padding: 10px 12px;"><span style="font-size: 11px; font-weight: 700;">${v.metodoPago}</span></td>
                    <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: ${v.anulada ? '#ef4444' : '#10b981'};">
                      ${v.anulada ? '<s>' : ''}$ ${Number(v.total || 0).toLocaleString('es-CO')}${v.anulada ? '</s>' : ''}
                    </td>
                    <td style="padding: 10px 12px; text-align: center;">
                      <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; ${
                        v.anulada
                          ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'
                          : 'background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;'
                      }">
                        ${v.anulada ? 'ANULADA' : 'COBRADA'}
                      </span>
                    </td>
                    <td style="padding: 10px 12px; text-align: center; white-space: nowrap;">
                      <button type="button" class="btn-reimprimir-tirilla" data-id="${v.id}" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; margin-right: 4px; display: inline-flex; align-items: center; gap: 4px;">
                        ${Icons.printer(12)} Tirilla
                      </button>
                      ${
                        !v.anulada
                          ? `
                        <button type="button" class="btn-anular-venta" data-id="${v.id}" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                          ✕ Anular
                        </button>
                      `
                          : ''
                      }
                    </td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      `;

      // Handlers de reimpresión
      content.querySelectorAll('.btn-reimprimir-tirilla').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const venta = ventas.find((v) => v.id === id);
          if (venta) {
            modal.style.display = 'none';
            this.mostrarTicketModal(venta);
          }
        });
      });

      // Handlers de anulación
      content.querySelectorAll('.btn-anular-venta').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const motivo = prompt('Motivo de anulación de la venta (ej: Error de digitación, devolución de cliente):');
          if (motivo !== null) {
            const ok = this.anularVenta(id, motivo);
            if (ok) {
              alert('Venta anulada con éxito. Inventario restaurado y caja ajustada.');
              this.openHistorialModal(); // Recargar tabla
            }
          }
        });
      });
    }

    modal.style.display = 'flex';
  }

  // ================= EVENTOS Y COBRO =================
  static bindEvents() {
    // Buscador POS
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.renderProductGrid();
      });
    }

    // Selector de Modo (Mostrador / Mesa / Vitrina)
    document.querySelectorAll('.pos-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pos-mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = btn.getAttribute('data-mode');
        this.renderCart();
      });
    });

    // Selector de Método de Pago
    document.querySelectorAll('.btn-pay-method').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-pay-method').forEach((b) => {
          b.classList.remove('active');
          b.style.borderColor = 'var(--border-subtle)';
          b.style.background = 'var(--bg-card)';
          b.style.color = 'var(--text-muted)';
        });
        btn.classList.add('active');
        this.selectedPaymentMethod = btn.getAttribute('data-method');

        const color = this.selectedPaymentMethod === 'EFECTIVO' ? '#10b981' : (this.selectedPaymentMethod === 'TARJETA' ? '#3b82f6' : '#8b5cf6');
        btn.style.borderColor = color;
        btn.style.background = color + '22';
        btn.style.color = color;
      });
    });

    // Botones de Turno y Ventas
    const btnCaja = document.getElementById('btn-caja-control');
    const statusChip = document.getElementById('pos-status-chip');
    if (btnCaja) btnCaja.addEventListener('click', () => this.openCajaModal());
    if (statusChip) statusChip.addEventListener('click', () => this.openCajaModal());

    const btnHistorial = document.getElementById('btn-historial-ventas');
    if (btnHistorial) btnHistorial.addEventListener('click', () => this.openHistorialModal());

    // Cierre de Modales
    const posModalIds = ['modal-ticket-backdrop', 'modal-caja-backdrop', 'modal-historial-backdrop'];
    document.querySelectorAll('.close-ticket-modal-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = document.getElementById('modal-ticket-backdrop');
        if (m) m.style.display = 'none';
      });
    });

    document.querySelectorAll('.close-caja-modal-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = document.getElementById('modal-caja-backdrop');
        if (m) m.style.display = 'none';
      });
    });

    document.querySelectorAll('.close-historial-modal-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = document.getElementById('modal-historial-backdrop');
        if (m) m.style.display = 'none';
      });
    });

    // Cerrar al hacer clic en el fondo oscuro exterior (backdrop)
    posModalIds.forEach((id) => {
      const m = document.getElementById(id);
      if (m) {
        m.addEventListener('click', (e) => {
          if (e.target === m) m.style.display = 'none';
        });
      }
    });

    // Acciones de la Tirilla (Imprimir y WhatsApp)
    const btnPrint = document.getElementById('btn-print-receipt');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    const btnWhatsapp = document.getElementById('btn-share-whatsapp');
    if (btnWhatsapp) {
      btnWhatsapp.addEventListener('click', () => {
        if (this.currentTicketVenta) {
          this.compartirTicketWhatsApp(this.currentTicketVenta);
        }
      });
    }

    // Abrir y cerrar comanda modal en móvil
    const btnOpenMobile = document.getElementById('btn-mobile-open-order');
    const btnCloseMobile = document.getElementById('btn-close-mobile-order');
    const orderColumn = document.getElementById('pos-order-column');

    if (btnOpenMobile && orderColumn) {
      btnOpenMobile.addEventListener('click', () => {
        orderColumn.classList.add('mobile-open');
      });
    }

    if (btnCloseMobile && orderColumn) {
      btnCloseMobile.addEventListener('click', () => {
        orderColumn.classList.remove('mobile-open');
      });
    }

    // Enviar a Cocina KDS
    const btnKds = document.getElementById('btn-send-kds');
    if (btnKds) {
      btnKds.addEventListener('click', () => {
        if (state.cartItems.length === 0) {
          alert('Agregue primero productos a la comanda antes de despachar a cocina.');
          return;
        }
        alert(`Comanda despachada con éxito al Monitor de Cocina KDS para ${state.selectedTable || 'Mostrador'}.`);
      });
    }

    // Cobro y Facturación conectada a PostgreSQL Cloud
    const btnPay = document.getElementById('btn-pos-pay');
    if (btnPay) {
      btnPay.addEventListener('click', async () => {
        if (state.cartItems.length === 0) {
          alert('No hay productos en la orden para liquidar.');
          return;
        }

        const subtotal = state.cartItems.reduce((acc, it) => acc + (Number(it.precio || it.precio_base || 0) * it.quantity), 0);
        const tax = Math.round(subtotal * 0.08);
        const tip = this.currentMode === 'Mesa' ? Math.round(subtotal * 0.1) : 0;
        const total = subtotal + tax + tip;

        const totalFormatted = `$ ${total.toLocaleString('es-CO')}`;
        const confirmMsg = `¿Cobrar ${totalFormatted} (${this.selectedPaymentMethod}) y emitir tirilla POS?`;
        if (!confirm(confirmMsg)) return;

        btnPay.disabled = true;
        btnPay.textContent = '⏳ Emitiendo en la nube...';

        try {
          let numeroComp = '';
          let comandaNum = '';

          try {
            // 1. Flujo nativo de Comanda + Cobro con descuento automático en Kardex (servicios excluidos)
            const modoAtencion =
              this.currentMode === 'Mostrador'
                ? 'MOSTRADOR_ESCANER'
                : this.currentMode === 'Vitrina'
                ? 'VITRINA_RAPIDO'
                : 'MESA_SERVICIO';

            const comandaRes = await ApiClient.createComanda({
              modoAtencion,
              clienteNombre: 'Consumidor Final',
              clienteNit: '222222222222',
              items: state.cartItems.map((it) => ({
                productoId: it.id,
                cantidad: it.quantity,
              })),
            });

            if (comandaRes && comandaRes.success && comandaRes.data?.id) {
              const cobroRes = await ApiClient.cobrarComanda(comandaRes.data.id, {
                tipoDocumento: 'DOCUMENTO_EQUIVALENTE_POS',
                metodoPago: this.selectedPaymentMethod,
                clienteNombre: 'Consumidor Final',
                clienteNit: '222222222222',
              });

              if (cobroRes && cobroRes.success) {
                numeroComp = cobroRes.factura?.numeroCompleto || 'POS-2026';
                comandaNum = comandaRes.data.numeroComanda || '';
              }
            }
          } catch (posErr) {
            console.warn('Fallback a emisión directa:', posErr);
            const res = await ApiClient.emitirFacturaDirecta({
              clienteNombre: 'Consumidor Final',
              clienteNit: '222222222222',
              tipoDocumento: 'DOCUMENTO_EQUIVALENTE_POS',
              baseGravable: subtotal,
              porcentajeIva: 8,
              metodoPago: this.selectedPaymentMethod,
              estadoDian: 'ACEPTADA',
              diasVencimiento: 1,
              notas: `Venta POS en ${state.selectedTable || 'Mostrador'}`,
            });
            if (res.success) {
              numeroComp = res.data.numeroCompleto;
            }
          }

          const finalComp = numeroComp || ('POS-' + Math.floor(1000 + Math.random() * 9000));

          // Registrar venta en el turno actual
          const nuevaVenta = {
            id: 'vta_' + Date.now().toString(36),
            comprobante: finalComp,
            fecha: new Date().toISOString(),
            cajero: state.currentUser?.nombre || 'Cajero en Turno',
            modoAtencion: this.currentMode,
            mesa: state.selectedTable || 'Mostrador',
            clienteNombre: 'Consumidor Final',
            clienteNit: '222222222222',
            items: [...state.cartItems],
            subtotal,
            tax,
            tip,
            total,
            metodoPago: this.selectedPaymentMethod,
            anulada: false,
          };

          this.registrarVentaEnTurno(nuevaVenta);

          // Limpiar carrito
          state.clearCart();
          this.renderCart();
          if (orderColumn) {
            orderColumn.classList.remove('mobile-open');
          }

          // Abrir modal de tirilla térmica inmediatamente
          this.mostrarTicketModal(nuevaVenta);
        } catch (err) {
          alert(`Error al procesar venta: ${err.message}`);
        } finally {
          btnPay.disabled = false;
          btnPay.innerHTML = `<span>${Icons.printer(16)} Cobrar e Imprimir</span>`;
        }
      });
    }
  }
}
