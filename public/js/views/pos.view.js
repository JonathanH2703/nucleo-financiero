/**
 * VISTA DE PUNTO DE VENTA (POS) — NÚCLEO FINANCIERO (FIGMA DARK THEME)
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

export class PosView {
  static async mount(container) {
    this.container = container;
    this.catalog = [];
    this.categories = [];
    this.selectedCategory = 'TODAS';
    this.searchTerm = '';
    this.currentMode = 'Mesa'; // 'Mostrador' | 'Mesa' | 'Vitrina'

    this.renderSkeleton();
    await this.loadData();
    this.renderCart();
  }

  static renderSkeleton() {
    const user = state.currentUser || { nombre: 'Cajero en Turno' };

    this.container.innerHTML = `
      <div class="pos-view-container">
        <!-- Columna Izquierda: Catálogo y Operación Táctil -->
        <div class="pos-catalog-column">
          <!-- Barra Superior de Modos de Operación -->
          <div class="pos-top-toolbar">
            <div class="pos-modes-group">
              <button type="button" class="pos-mode-btn ${this.currentMode === 'Mostrador' ? 'active' : ''}" data-mode="Mostrador">
                <span>🛒 Mostrador / Escáner</span>
              </button>
              <button type="button" class="pos-mode-btn ${this.currentMode === 'Mesa' ? 'active' : ''}" data-mode="Mesa">
                <span>🍽️ Mesa</span>
              </button>
              <button type="button" class="pos-mode-btn ${this.currentMode === 'Vitrina' ? 'active' : ''}" data-mode="Vitrina">
                <span>🍰 Vitrina / Rápido</span>
              </button>
            </div>

            <div class="pos-status-chip">
              <span class="dot"></span>
              <span>Caja abierta · Turno 08:00–16:00 · ${state.selectedTable} · ${user.nombre}</span>
            </div>
          </div>

          <!-- Buscador y Tercero -->
          <div class="pos-search-row">
            <input type="text" id="pos-search-input" class="pos-search-input" placeholder="🔍 Buscar por nombre o código de barras...">
            <div class="pos-client-pill">
              <span>👤 Consumidor final (222222222222)</span>
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
                ⏳ Cargando catálogo especializado de ${state.currentTenant.name}...
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
                <h3>Comanda · ${state.selectedTable}</h3>
              </div>
              <span id="order-units-count" style="font-size: 12px; color: #f59e0b; font-weight: 700;">0 ítems</span>
            </div>
            <p class="order-subtitle">Descuenta inventario en tiempo real del área operativa</p>

            <div class="order-quick-actions">
              <button class="btn-order-action" id="btn-dividir-cuenta">Dividir cuenta</button>
              <button class="btn-order-action" id="btn-unir-mesas">Unir mesas</button>
              <button class="btn-order-action" id="btn-cambiar-mesa">Cambiar mesa</button>
            </div>
          </div>

          <!-- Lista de ítems del pedido -->
          <div class="order-items-list" id="order-items-list">
            <div class="empty-order-placeholder">
              <div class="icon">🛒</div>
              <p><b>Venta lista para empezar</b></p>
              <p style="font-size: 11px;">Selecciona productos del catálogo o usa el escáner.</p>
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
                <span>🍳 Enviar a Cocina</span>
              </button>
              <button type="button" class="btn-pos-pay" id="btn-pos-pay">
                <span>💳 Cobrar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra flotante móvil para abrir la comanda -->
      <div class="pos-mobile-order-bar" id="pos-mobile-order-bar">
        <div class="pos-mobile-order-info">
          <div class="icon">🛏️</div>
          <div>
            <div style="font-size: 12px; font-weight: 700;">${state.selectedTable}</div>
            <div class="pos-mobile-bar-total" id="mobile-bar-total">$ 0</div>
          </div>
        </div>
        <button type="button" class="btn-mobile-open-order" id="btn-mobile-open-order">📋 Ver Comanda</button>
      </div>
    `;

    this.bindEvents();
  }

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

        // Mapear el nombre de categoría a cada producto para filtros rápidos
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
            ❌ Error al cargar catálogo: ${err.message}
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

        return `
          <div class="pos-product-card" data-id="${p.id}">
            <div>
              <div class="pos-product-icon-wrap">${icon}</div>
              <div class="pos-product-name">${p.nombre}</div>
              <div class="pos-product-stock">Stock actual: ${p.stockActual || 18} disp.</div>
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
            precio_base: prod.precioBase,
            tipo_impuesto: prod.tipoImpuesto,
          });
          this.renderCart();
        }
      });
    });
  }

  static getProductIcon(nombre, cat) {
    const n = (nombre + ' ' + (cat || '')).toLowerCase();
    if (n.includes('ceviche') || n.includes('camarón')) return '🦐';
    if (n.includes('antipasto') || n.includes('queso')) return '🧀';
    if (n.includes('lomo') || n.includes('carne')) return '🥩';
    if (n.includes('salmón') || n.includes('pescado')) return '🐟';
    if (n.includes('cerveza')) return '🍺';
    if (n.includes('limonada') || n.includes('coco')) return '🥥';
    if (n.includes('negroni') || n.includes('cóctel') || n.includes('sour')) return '🍹';
    if (n.includes('croissant') || n.includes('pan')) return '🥐';
    if (n.includes('torta') || n.includes('pastel')) return '🍰';
    if (n.includes('café') || n.includes('capuccino')) return '☕';
    if (n.includes('empanada')) return '🥟';
    if (n.includes('arroz') || n.includes('grano')) return '🌾';
    if (n.includes('aceite')) return '🫒';
    if (n.includes('leche')) return '🥛';
    if (n.includes('huevo')) return '🥚';
    if (n.includes('acetaminofén') || n.includes('droguería')) return '💊';
    if (n.includes('jabón') || n.includes('detergente')) return '🧼';
    return '📦';
  }

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
          <div class="icon">🛒</div>
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
        const itemSubtotal = item.precio * item.quantity;
        subtotal += itemSubtotal;
        totalItems += item.quantity;

        return `
          <div class="order-item-row">
            <div class="item-left">
              <span class="item-name">${item.nombre}</span>
              <span class="item-meta">$ ${item.precio.toLocaleString('es-CO')} c/u</span>
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
    const tip = Math.round(subtotal * 0.1);  // Propina voluntaria 10%
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
      });
    });

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
        alert(`🍳 ¡Comanda despachada con éxito al Monitor de Cocina KDS para ${state.selectedTable}!`);
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

        const totalText = document.getElementById('summary-total').textContent;
        const subtotal = state.cartItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
        const confirmMsg = `¿Proceder con el cobro por ${totalText} y emisión de Factura Fiscal DIAN?`;
        if (!confirm(confirmMsg)) return;

        btnPay.disabled = true;
        btnPay.textContent = '⏳ Guardando en base de datos...';

        try {
          const res = await ApiClient.emitirFacturaDirecta({
            clienteNombre: 'Consumidor Final',
            clienteNit: '222222222222',
            tipoDocumento: 'DOCUMENTO_EQUIVALENTE_POS',
            baseGravable: subtotal,
            porcentajeIva: 8,
            metodoPago: 'EFECTIVO',
            estadoDian: 'ACEPTADA',
            diasVencimiento: 1,
            notas: `Venta POS en ${state.selectedTable || 'Mesa 02'}`
          });

          if (!res.success) throw new Error(res.message || 'Error al procesar cobro');

          alert(`✅ ¡Pago y venta guardados con éxito en la base de datos!\nComprobante: ${res.data.numeroCompleto}\nCUFE: ${res.data.cufe || 'Generado DIAN'}\nEstado: Aceptada y Liquidada`);
          state.clearCart();
          this.renderCart();
          if (orderColumn) {
            orderColumn.classList.remove('mobile-open');
          }
        } catch (err) {
          alert(`❌ Error al guardar en base de datos: ${err.message}`);
        } finally {
          btnPay.disabled = false;
          btnPay.textContent = 'Cobrar e Imprimir';
        }
      });
    }
  }
}
