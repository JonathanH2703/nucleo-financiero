/**
 * VISTA DE GESTIÓN DE INVENTARIOS & KARDEX — NÚCLEO FINANCIERO
 * Diseñada para comercios pequeños y medianos. Permite control de existencias,
 * catálogo de productos, registro ágil de entradas/salidas, cuadres físicos y Kardex inmutable.
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

export class InventarioView {
  static async mount(container) {
    this.container = container;
    this.activeTab = 'catalogo'; // 'catalogo' | 'kardex' | 'ajustes' | 'bodegas'
    this.productos = [];
    this.categorias = [];
    this.bodegas = [];
    this.kardex = [];
    this.ajustes = [];
    this.selectedBodegaId = null;
    this.searchTerm = '';
    this.selectedCategoria = 'TODAS';
    this.filterStockBajo = false;
    this.isLoading = true;

    this.render();
    await this.loadInitialData();
  }

  static render() {
    const isSmallBusiness = state.currentTenant?.plan === 'basico';

    this.container.innerHTML = `
      <div class="inventario-view-container" style="max-width: 1240px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; padding-bottom: 50px;">
        <!-- Header Principal -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 18px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <span style="font-size: 28px;">📦</span>
              <div>
                <h1 style="font-size: 22px; font-weight: 800; color: var(--text-main); margin: 0;">
                  Inventario & Control de Stock
                </h1>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                  <span style="font-size: 13px; color: var(--text-muted);">${state.currentTenant.name}</span>
                  <span class="badge" style="font-size: 11px; font-weight: 800; ${
                    isSmallBusiness
                      ? 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'
                      : 'background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;'
                  }">
                    ${isSmallBusiness ? '🌱 Modo Comercio Ágil' : '⭐ Modo Integral Multi-Bodega'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Acciones Rápidas -->
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" id="btn-refresh-inv" style="background: var(--bg-card); border: 1px solid var(--border-subtle); color: var(--text-main); padding: 9px 15px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              🔄 Actualizar
            </button>
            <button type="button" id="btn-movimiento-rapido" style="background: #059669; color: #ffffff; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
              📥 Entrada Rápida de Stock
            </button>
            <button type="button" id="btn-nuevo-producto" style="background: #2563eb; color: #ffffff; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
              + Nuevo Producto
            </button>
          </div>
        </div>

        <!-- Tarjetas de Métricas de Inventario -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 22px;">🏷️</div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Productos Activos</div>
              <div id="stat-total-prods" style="font-size: 22px; font-weight: 900; color: var(--text-main);">-</div>
            </div>
          </div>

          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 22px;">📊</div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Stock en Bodega</div>
              <div id="stat-total-stock" style="font-size: 22px; font-weight: 900; color: #059669;">-</div>
            </div>
          </div>

          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #fef2f2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 22px;">⚠️</div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Stock Bajo / Agotado</div>
              <div id="stat-stock-bajo" style="font-size: 22px; font-weight: 900; color: #dc2626;">-</div>
            </div>
          </div>

          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #faf5ff; color: #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 22px;">🏢</div>
            <div style="flex: 1;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Bodega Activa</div>
              <select id="select-bodega-activa" style="width: 100%; font-size: 13px; font-weight: 700; color: var(--text-main); background: transparent; border: none; outline: none; cursor: pointer; padding: 2px 0;">
                <option value="">Cargando bodegas...</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Pestañas de Navegación del Módulo -->
        <div style="display: flex; gap: 8px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 2px; overflow-x: auto;">
          <button type="button" class="inv-tab-btn ${this.activeTab === 'catalogo' ? 'active' : ''}" data-tab="catalogo" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'catalogo' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'catalogo' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer; white-space: nowrap;">
            📦 Catálogo & Existencias
          </button>
          <button type="button" class="inv-tab-btn ${this.activeTab === 'kardex' ? 'active' : ''}" data-tab="kardex" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'kardex' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'kardex' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer; white-space: nowrap;">
            📜 Kardex de Movimientos
          </button>
          <button type="button" class="inv-tab-btn ${this.activeTab === 'ajustes' ? 'active' : ''}" data-tab="ajustes" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'ajustes' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'ajustes' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer; white-space: nowrap;">
            ⚖️ Ajustes & Cuadres Físicos
          </button>
          <button type="button" class="inv-tab-btn ${this.activeTab === 'bodegas' ? 'active' : ''}" data-tab="bodegas" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'bodegas' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'bodegas' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer; white-space: nowrap;">
            🏢 Bodegas & Ubicaciones
          </button>
        </div>

        <!-- Contenedor Dinámico -->
        <div id="inv-tab-content">
          ${this.isLoading ? `
            <div style="padding: 60px; text-align: center; color: var(--text-muted);">
              ⏳ Cargando catálogo y existencias en tiempo real...
            </div>
          ` : this.renderCurrentTab()}
        </div>
      </div>

      <!-- Modal: Crear Nuevo Producto -->
      <div id="modal-producto-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2200; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 18px;">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">+ Registrar Nuevo Producto</h3>
            <button type="button" class="close-modal-btn" style="background: var(--bg-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <form id="form-crear-producto">
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Código / SKU *</label>
                <input type="text" id="prod-codigo" required placeholder="Ej: PAN-001" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 700;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Nombre del Producto *</label>
                <input type="text" id="prod-nombre" required placeholder="Ej: Pan Tajado Integral Artesanal" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Categoría *</label>
                <select id="prod-categoria" required style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
                  <!-- Cargado dinámicamente -->
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Unidad de Medida (Colombia) *</label>
                <select id="prod-unidad" required style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
                  <option value="UNIDAD">Unidad / Pieza</option>
                  <option value="KG_GRAMOS">Kilogramo / Gramo</option>
                  <option value="LITRO_ML">Litro / Mililitro</option>
                  <option value="PORCION">Porción / Ración</option>
                  <option value="CAJA">Caja</option>
                  <option value="PAQUETE">Paquete</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Costo Unitario ($)</label>
                <input type="number" id="prod-costo" min="0" step="100" value="0" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Precio Venta ($) *</label>
                <input type="number" id="prod-precio" required min="0" step="100" placeholder="5000" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: #059669; font-weight: 800;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Impuesto</label>
                <select id="prod-impuesto" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
                  <option value="EXCLUIDO">Excluido / Exento (0%)</option>
                  <option value="INC_8">Impoconsumo (8%)</option>
                  <option value="IVA_19">IVA General (19%)</option>
                  <option value="IVA_5">IVA Reducido (5%)</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Stock Inicial</label>
                <input type="number" id="prod-stock-inicial" min="0" value="0" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 700;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Stock Mínimo (Alerta)</label>
                <input type="number" id="prod-stock-minimo" min="0" value="5" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-producto" style="padding: 10px 22px; border-radius: 10px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                ✓ Guardar Producto
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Entrada Rápida de Stock -->
      <div id="modal-movimiento-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2200; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 520px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 18px;">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">📥 Entrada Directa de Mercancía</h3>
            <button type="button" class="close-modal-btn" style="background: var(--bg-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <form id="form-movimiento-rapido">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Producto a Ingresar *</label>
              <select id="mov-producto" required style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600;">
                <!-- Dinámico -->
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Cantidad a Ingresar *</label>
                <input type="number" id="mov-cantidad" required min="1" step="1" value="10" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: #059669; font-size: 16px; font-weight: 800;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Costo Unitario ($)</label>
                <input type="number" id="mov-costo" min="0" step="100" placeholder="0" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600;">
              </div>
            </div>

            <div style="margin-bottom: 18px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Notas / Proveedor de Compra</label>
              <input type="text" id="mov-notas" placeholder="Ej: Compra directa distribuidor local" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main);">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-movimiento" style="padding: 10px 22px; border-radius: 10px; border: none; background: #059669; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                📥 Asentar Entrada en Kardex
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  static renderCurrentTab() {
    switch (this.activeTab) {
      case 'kardex':
        return this.renderKardexTab();
      case 'ajustes':
        return this.renderAjustesTab();
      case 'bodegas':
        return this.renderBodegasTab();
      case 'catalogo':
      default:
        return this.renderCatalogoTab();
    }
  }

  static renderCatalogoTab() {
    let filtered = this.productos;

    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.nombre.toLowerCase().includes(q) || (p.codigo && p.codigo.toLowerCase().includes(q)));
    }

    if (this.selectedCategoria !== 'TODAS') {
      filtered = filtered.filter(p => p.categoriaId === this.selectedCategoria);
    }

    if (this.filterStockBajo) {
      filtered = filtered.filter(p => Number(p.stockActual || 0) <= Number(p.stockMinimo || 5));
    }

    return `
      <div>
        <!-- Barra de Búsqueda y Filtros -->
        <div style="display: flex; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="display: flex; gap: 10px; flex: 1; max-width: 480px;">
            <input type="text" id="inv-search-input" value="${this.searchTerm}" placeholder="🔍 Buscar por nombre o código SKU..." style="flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main);">
            <select id="inv-filter-cat" style="padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600;">
              <option value="TODAS">Todas las Categorías</option>
              ${this.categorias.map(c => `
                <option value="${c.id}" ${this.selectedCategoria === c.id ? 'selected' : ''}>${c.nombre}</option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: ${this.filterStockBajo ? '#dc2626' : 'var(--text-muted)'}; cursor: pointer;">
              <input type="checkbox" id="check-stock-bajo" ${this.filterStockBajo ? 'checked' : ''} style="width: 16px; height: 16px;">
              <span>Solo Alertas de Stock Bajo</span>
            </label>
          </div>
        </div>

        <!-- Tabla de Productos -->
        ${filtered.length === 0 ? `
          <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); padding: 50px; text-align: center;">
            <span style="font-size: 36px; display: block; margin-bottom: 10px;">🏷️</span>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">No se encontraron productos</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Crea el primer producto o ajusta los filtros de búsqueda.</p>
            <button type="button" class="btn-nuevo-prod-trigger" style="background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 700; cursor: pointer;">
              + Registrar Primer Producto
            </button>
          </div>
        ` : `
          <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); overflow: hidden; box-shadow: var(--shadow-sm);">
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                  <tr style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                    <th style="padding: 12px 16px;">Código</th>
                    <th style="padding: 12px 16px;">Producto</th>
                    <th style="padding: 12px 16px;">Categoría</th>
                    <th style="padding: 12px 16px;">Unidad</th>
                    <th style="padding: 12px 16px; text-align: right;">Costo</th>
                    <th style="padding: 12px 16px; text-align: right;">Precio Venta</th>
                    <th style="padding: 12px 16px; text-align: center;">Stock Bodega</th>
                    <th style="padding: 12px 16px; text-align: center;">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map(p => {
                    const stock = Number(p.stockActual || 0);
                    const min = Number(p.stockMinimo || 5);
                    const isLow = stock <= min;
                    const cat = this.categorias.find(c => c.id === p.categoriaId);

                    return `
                      <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s;" onmouseover="this.style.background='var(--bg-subtle)'" onmouseout="this.style.background='transparent'">
                        <td style="padding: 12px 16px; font-family: monospace; font-weight: 700; color: var(--text-muted);">${p.codigo || 'S/C'}</td>
                        <td style="padding: 12px 16px;">
                          <div style="font-weight: 700; color: var(--text-main);">${p.nombre}</div>
                          ${p.descripcion ? `<div style="font-size: 11px; color: var(--text-muted);">${p.descripcion}</div>` : ''}
                        </td>
                        <td style="padding: 12px 16px;">
                          <span class="badge" style="background: var(--bg-subtle); color: var(--text-main); font-weight: 600;">${cat ? cat.nombre : 'General'}</span>
                        </td>
                        <td style="padding: 12px 16px; color: var(--text-muted);">${p.unidadMedida || 'UNIDAD'}</td>
                        <td style="padding: 12px 16px; text-align: right; color: var(--text-muted);">$ ${Number(p.costo || 0).toLocaleString('es-CO')}</td>
                        <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: #059669;">$ ${Number(p.precioBase || 0).toLocaleString('es-CO')}</td>
                        <td style="padding: 12px 16px; text-align: center;">
                          <span class="badge" style="${
                            isLow
                              ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: 800;'
                              : 'background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-weight: 800;'
                          }">
                            ${stock} ${isLow ? '⚠️' : '✓'}
                          </span>
                        </td>
                        <td style="padding: 12px 16px; text-align: center;">
                          <button type="button" class="btn-recargar-stock" data-id="${p.id}" data-nombre="${p.nombre}" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                            + Stock
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>
    `;
  }

  static renderKardexTab() {
    return `
      <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); overflow: hidden; box-shadow: var(--shadow-sm);">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: var(--text-main); margin: 0;">📜 Historial Inmutable de Kardex</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">Cada venta, compra, merma o ajuste queda registrado cronológicamente.</p>
          </div>
          <button type="button" id="btn-nuevo-mov-kardex" style="background: #059669; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
            + Asentar Movimiento
          </button>
        </div>

        ${this.kardex.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            No hay movimientos registrados en el Kardex para esta bodega.
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
              <thead>
                <tr style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 10px 14px;">Fecha</th>
                  <th style="padding: 10px 14px;">Tipo</th>
                  <th style="padding: 10px 14px;">Producto</th>
                  <th style="padding: 10px 14px;">Referencia</th>
                  <th style="padding: 10px 14px; text-align: right;">Cantidad</th>
                  <th style="padding: 10px 14px; text-align: right;">Costo Unit.</th>
                  <th style="padding: 10px 14px;">Notas</th>
                </tr>
              </thead>
              <tbody>
                ${this.kardex.map(m => {
                  const isEntrada = ['ENTRADA', 'COMPRA', 'AJUSTE_POSITIVO'].includes(m.tipo);
                  const isVenta = ['VENTA', 'SALIDA', 'MERMA', 'AJUSTE_NEGATIVO'].includes(m.tipo);

                  return `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 10px 14px; color: var(--text-muted);">${new Date(m.createdAt || m.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td style="padding: 10px 14px;">
                        <span class="badge" style="${
                          isEntrada
                            ? 'background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;'
                            : (isVenta ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #eff6ff; color: #2563eb;')
                        } font-weight: 800; font-size: 10px;">
                          ${m.tipo}
                        </span>
                      </td>
                      <td style="padding: 10px 14px; font-weight: 700; color: var(--text-main);">${m.productoNombre || m.producto_id || 'Ítem'}</td>
                      <td style="padding: 10px 14px; font-family: monospace; color: var(--text-muted);">${m.referenciaDocumento || m.referencia_documento || 'DIRECTO'}</td>
                      <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: ${isEntrada ? '#059669' : '#dc2626'};">
                        ${isEntrada ? '+' : '-'}${Math.abs(m.cantidad)}
                      </td>
                      <td style="padding: 10px 14px; text-align: right; color: var(--text-muted);">$ ${Number(m.costoUnitario || m.costo_unitario || 0).toLocaleString('es-CO')}</td>
                      <td style="padding: 10px 14px; color: var(--text-muted); font-size: 11px;">${m.notas || 'Sin observaciones'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  static renderAjustesTab() {
    return `
      <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); overflow: hidden; box-shadow: var(--shadow-sm); padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0;">⚖️ Cuadres Físicos de Fin de Día</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">Registra conteos reales a ciegas y concilia sobrantes o faltantes con el Kardex.</p>
          </div>
        </div>

        <div style="background: var(--bg-subtle); border-radius: 12px; padding: 20px; border: 1px dashed var(--border-subtle); text-align: center;">
          <span style="font-size: 32px; display: block; margin-bottom: 8px;">📋</span>
          <h4 style="font-size: 14px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">Cuadre de Inventario Rápido</h4>
          <p style="font-size: 12px; color: var(--text-muted); max-width: 440px; margin: 0 auto 14px auto;">
            Para pequeños negocios: ingresa el conteo físico al cerrar la jornada. El sistema ajustará automáticamente las diferencias en el Kardex.
          </p>
          <button type="button" id="btn-iniciar-cuadre" style="background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;">
            + Iniciar Conteo Físico
          </button>
        </div>
      </div>
    `;
  }

  static renderBodegasTab() {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
        ${this.bodegas.map(b => `
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <span style="font-size: 24px;">🏢</span>
                <span class="badge" style="background: #ecfdf5; color: #059669; font-weight: 700; font-size: 11px;">
                  CÓDIGO: ${b.codigo || 'BOD-01'}
                </span>
              </div>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">${b.nombre}</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0;">${b.ubicacion || 'Sede Principal'}</p>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 10px; display: flex; justify-content: space-between;">
              <span>Tipo: ${b.tipo || 'PRINCIPAL'}</span>
              <span style="color: #059669; font-weight: 700;">● Activa</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  static async loadInitialData() {
    this.isLoading = true;
    try {
      const [prodsRes, catsRes, bodsRes, kardexRes] = await Promise.all([
        ApiClient.listProductos(),
        ApiClient.listCategorias(),
        ApiClient.listBodegas(),
        ApiClient.getKardex({ limit: 50 }),
      ]);

      if (prodsRes && prodsRes.success) {
        this.productos = prodsRes.data || [];
      }
      if (catsRes && catsRes.success) {
        this.categorias = catsRes.data || [];
      }
      if (bodsRes && bodsRes.success) {
        this.bodegas = bodsRes.data || [];
        if (this.bodegas.length > 0 && !this.selectedBodegaId) {
          this.selectedBodegaId = this.bodegas[0].id;
        }
      }
      if (kardexRes && kardexRes.success) {
        this.kardex = kardexRes.data || [];
      }
    } catch (err) {
      console.warn('Error al cargar datos de inventario:', err);
    } finally {
      this.isLoading = false;
      this.updateStatsUI();
      const content = document.getElementById('inv-tab-content');
      if (content) {
        content.innerHTML = this.renderCurrentTab();
        this.bindDynamicEvents();
      }
    }
  }

  static updateStatsUI() {
    const elProds = document.getElementById('stat-total-prods');
    const elStock = document.getElementById('stat-total-stock');
    const elBajo = document.getElementById('stat-stock-bajo');
    const selectBodega = document.getElementById('select-bodega-activa');

    const totalStock = this.productos.reduce((acc, p) => acc + Number(p.stockActual || 0), 0);
    const bajoStock = this.productos.filter(p => Number(p.stockActual || 0) <= Number(p.stockMinimo || 5)).length;

    if (elProds) elProds.textContent = String(this.productos.length);
    if (elStock) elStock.textContent = String(totalStock);
    if (elBajo) elBajo.textContent = String(bajoStock);

    if (selectBodega && this.bodegas.length > 0) {
      selectBodega.innerHTML = this.bodegas.map(b => `
        <option value="${b.id}" ${this.selectedBodegaId === b.id ? 'selected' : ''}>${b.nombre}</option>
      `).join('');
    }
  }

  static bindEvents() {
    // Cambio de pestañas
    document.querySelectorAll('.inv-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
        this.updateStatsUI();
      });
    });

    // Botón Refresh
    const btnRefresh = document.getElementById('btn-refresh-inv');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadInitialData());
    }

    // Modal Nuevo Producto
    const btnNuevoProd = document.getElementById('btn-nuevo-producto');
    if (btnNuevoProd) {
      btnNuevoProd.addEventListener('click', () => {
        const modal = document.getElementById('modal-producto-backdrop');
        const selCat = document.getElementById('prod-categoria');
        if (selCat) {
          selCat.innerHTML = this.categorias.map(c => `
            <option value="${c.id}">${c.nombre}</option>
          `).join('');
        }
        if (modal) modal.style.display = 'flex';
      });
    }

    // Modal Entrada Rápida
    const btnMovRapido = document.getElementById('btn-movimiento-rapido');
    if (btnMovRapido) {
      btnMovRapido.addEventListener('click', () => {
        this.openMovimientoModal();
      });
    }

    // Cerrar Modales
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m1 = document.getElementById('modal-producto-backdrop');
        const m2 = document.getElementById('modal-movimiento-backdrop');
        if (m1) m1.style.display = 'none';
        if (m2) m2.style.display = 'none';
      });
    });

    // Enviar Formulario Nuevo Producto
    const formProd = document.getElementById('form-crear-producto');
    if (formProd) {
      formProd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-producto');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Guardando...';

        try {
          const codigo = document.getElementById('prod-codigo').value.trim();
          const nombre = document.getElementById('prod-nombre').value.trim();
          const categoriaId = document.getElementById('prod-categoria').value;
          const unidadMedida = document.getElementById('prod-unidad').value;
          const costo = Number(document.getElementById('prod-costo').value || 0);
          const precioBase = Number(document.getElementById('prod-precio').value || 0);
          const stockInicial = Number(document.getElementById('prod-stock-inicial').value || 0);
          const stockMinimo = Number(document.getElementById('prod-stock-minimo').value || 5);

          const res = await ApiClient.createProducto({
            codigo,
            nombre,
            categoriaId,
            unidadMedida,
            costo,
            precioBase,
            stockInicial,
            stockMinimo,
            bodegaId: this.selectedBodegaId || (this.bodegas[0]?.id),
          });

          if (res.success) {
            alert(`✅ ¡Producto "${nombre}" registrado con éxito!`);
            document.getElementById('modal-producto-backdrop').style.display = 'none';
            formProd.reset();
            await this.loadInitialData();
          }
        } catch (err) {
          alert(`❌ Error al crear producto: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '✓ Guardar Producto';
        }
      });
    }

    // Enviar Formulario Entrada Rápida
    const formMov = document.getElementById('form-movimiento-rapido');
    if (formMov) {
      formMov.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-movimiento');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Asentando...';

        try {
          const productoId = document.getElementById('mov-producto').value;
          const cantidad = Number(document.getElementById('mov-cantidad').value || 1);
          const costoUnitario = Number(document.getElementById('mov-costo').value || 0);
          const notas = document.getElementById('mov-notas').value.trim();

          const res = await ApiClient.registrarMovimientoInventario({
            productoId,
            bodegaId: this.selectedBodegaId || (this.bodegas[0]?.id),
            tipo: 'ENTRADA',
            cantidad,
            costoUnitario,
            notas: notas || 'Entrada directa de mostrador',
          });

          if (res.success) {
            alert(`✅ ¡Entrada de stock asentada en Kardex exitosamente!`);
            document.getElementById('modal-movimiento-backdrop').style.display = 'none';
            formMov.reset();
            await this.loadInitialData();
          }
        } catch (err) {
          alert(`❌ Error al registrar entrada: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '📥 Asentar Entrada en Kardex';
        }
      });
    }

    this.bindDynamicEvents();
  }

  static openMovimientoModal(selectedProdId = null) {
    const modal = document.getElementById('modal-movimiento-backdrop');
    const selProd = document.getElementById('mov-producto');
    if (selProd) {
      selProd.innerHTML = this.productos.map(p => `
        <option value="${p.id}" ${selectedProdId === p.id ? 'selected' : ''}>
          ${p.nombre} (Stock actual: ${p.stockActual || 0})
        </option>
      `).join('');
    }
    if (modal) modal.style.display = 'flex';
  }

  static bindDynamicEvents() {
    // Buscador en Catálogo
    const searchInput = document.getElementById('inv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        const content = document.getElementById('inv-tab-content');
        if (content) content.innerHTML = this.renderCurrentTab();
        this.bindDynamicEvents();
      });
    }

    // Filtro Categoría
    const filterCat = document.getElementById('inv-filter-cat');
    if (filterCat) {
      filterCat.addEventListener('change', (e) => {
        this.selectedCategoria = e.target.value;
        const content = document.getElementById('inv-tab-content');
        if (content) content.innerHTML = this.renderCurrentTab();
        this.bindDynamicEvents();
      });
    }

    // Checkbox Stock Bajo
    const checkBajo = document.getElementById('check-stock-bajo');
    if (checkBajo) {
      checkBajo.addEventListener('change', (e) => {
        this.filterStockBajo = e.target.checked;
        const content = document.getElementById('inv-tab-content');
        if (content) content.innerHTML = this.renderCurrentTab();
        this.bindDynamicEvents();
      });
    }

    // Botón Recargar Stock en fila
    document.querySelectorAll('.btn-recargar-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const prodId = btn.getAttribute('data-id');
        this.openMovimientoModal(prodId);
      });
    });

    // Triggers modales
    document.querySelectorAll('.btn-nuevo-prod-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = document.getElementById('btn-nuevo-producto');
        if (b) b.click();
      });
    });
  }
}
