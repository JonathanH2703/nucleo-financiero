/**
 * VISTA DE GESTIÓN DE INVENTARIOS & KARDEX — NÚCLEO FINANCIERO
 * Control integral de catálogo, existencias multi-bodega, valorización,
 * movimientos de entrada/salida/merma, cuadres físicos y Kardex inmutable.
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';
import { Icons } from '../icons.js';

export class InventarioView {
  static async mount(container) {
    this.container = container;
    this.activeTab = 'catalogo'; // 'catalogo' | 'kardex' | 'ajustes' | 'bodegas'
    this.productos = [];
    this.categorias = [];
    this.bodegas = [];
    this.sucursales = [];
    this.kardex = [];
    this.ajustes = [];
    this.selectedBodegaId = null;

    // Filtros de catálogo
    this.searchTerm = '';
    this.selectedCategoria = 'TODAS';
    this.filterStockBajo = false;
    this.catalogPage = 1;
    this.catalogPageSize = 12;

    // Filtros de Kardex
    this.kardexFilterTipo = 'TODOS';
    this.kardexFilterProducto = 'TODOS';

    // Estado de edición / cuadre
    this.editingProductoId = null;
    this.cuadreItems = [];
    this.isLoading = true;

    this.render();
    await this.loadInitialData();
  }

  static escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  static formatMoney(val) {
    return `$ ${Number(val || 0).toLocaleString('es-CO')}`;
  }

  static getPlanCapabilities() {
    const plan = state.currentTenant?.plan || 'basico';
    const modulos = Array.isArray(state.currentTenant?.modulosActivos) ? state.currentTenant.modulosActivos : [];
    const isBasic = plan === 'basico';
    const hasDian = !isBasic || modulos.includes('facturacion');
    const hasMultiBodega = !isBasic;
    return { isBasic, hasDian, hasMultiBodega };
  }

  static render() {
    const { isBasic, hasDian, hasMultiBodega } = this.getPlanCapabilities();
    if (!hasMultiBodega && this.activeTab === 'bodegas') {
      this.activeTab = 'catalogo';
    }

    this.container.innerHTML = `
      <div class="inventario-view-container" style="max-width: 1260px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; padding-bottom: 50px;">
        <!-- Header Principal -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 18px;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
              <span style="display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 10px; background: rgba(37, 99, 235, 0.1); color: #2563eb;">
                ${Icons.inventario(22)}
              </span>
              <div>
                <h1 style="font-size: 22px; font-weight: 800; color: var(--text-main); margin: 0;">
                  Inventario & Control de Stock
                </h1>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 3px;">
                  <span style="font-size: 13px; color: var(--text-muted);">${this.escapeHtml(state.currentTenant?.name || '')}</span>
                  <span class="badge" style="font-size: 11px; font-weight: 800; ${
                    isBasic
                      ? 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'
                      : 'background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;'
                  }">
                    ${isBasic ? 'Modo Comercio Ágil' : 'Modo Integral Multi-Bodega'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Acciones Rápidas -->
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" id="btn-refresh-inv" style="background: var(--bg-card); border: 1px solid var(--border-subtle); color: var(--text-main); padding: 9px 15px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              ${Icons.refresh(15)} Actualizar
            </button>
            <button type="button" id="btn-movimiento-rapido" style="background: #059669; color: #ffffff; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
              ${Icons.download(15)} Movimiento de Stock
            </button>
            <button type="button" id="btn-nuevo-producto" style="background: #2563eb; color: #ffffff; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
              ${Icons.plus(16)} Nuevo Producto
            </button>
          </div>
        </div>

        <!-- Tarjetas de Métricas de Inventario -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center;">${Icons.package(20)}</div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Catálogo Activo</div>
              <div id="stat-total-prods" style="font-size: 22px; font-weight: 900; color: var(--text-main);">-</div>
              <div id="stat-sub-prods" style="font-size: 11px; color: var(--text-muted);"></div>
            </div>
          </div>

          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center;">${Icons.dollarSign(20)}</div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Valorización Stock</div>
              <div id="stat-valor-stock" style="font-size: 20px; font-weight: 900; color: #059669;">-</div>
              <div id="stat-total-stock" style="font-size: 11px; color: var(--text-muted); font-weight: 600;">- unidades totales</div>
            </div>
          </div>

          <div id="card-stock-bajo-trigger" title="Clic para filtrar alertas de stock bajo" style="background: var(--bg-card); border: 1px solid ${this.filterStockBajo ? '#dc2626' : 'var(--border-subtle)'}; border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm); cursor: pointer; transition: border-color 0.2s;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #fef2f2; color: #dc2626; display: flex; align-items: center; justify-content: center;">${Icons.alertCircle(20)}</div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Stock Bajo / Agotado</div>
              <div id="stat-stock-bajo" style="font-size: 22px; font-weight: 900; color: #dc2626;">-</div>
              <div style="font-size: 11px; color: var(--text-muted);">Clic para filtrar</div>
            </div>
          </div>

          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #faf5ff; color: #7c3aed; display: flex; align-items: center; justify-content: center;">${Icons.building(20)}</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">${hasMultiBodega ? 'Bodega Activa' : 'Punto de Despacho'}</div>
              ${hasMultiBodega ? `
                <select id="select-bodega-activa" style="width: 100%; font-size: 13px; font-weight: 700; color: var(--text-main); background: transparent; border: none; outline: none; cursor: pointer; padding: 2px 0; text-overflow: ellipsis;">
                  <option value="">Cargando bodegas...</option>
                </select>
              ` : `
                <div style="font-size: 14px; font-weight: 800; color: var(--text-main); padding: 2px 0;">Mostrador / Sede Única</div>
              `}
            </div>
          </div>
        </div>

        <!-- Pestañas de Navegación del Módulo -->
        <div style="display: flex; gap: 8px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 2px; overflow-x: auto;">
          <button type="button" class="inv-tab-btn ${this.activeTab === 'catalogo' ? 'active' : ''}" data-tab="catalogo" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'catalogo' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'catalogo' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px;">
            ${Icons.package(15)} Catálogo & Existencias
          </button>
          <button type="button" class="inv-tab-btn ${this.activeTab === 'kardex' ? 'active' : ''}" data-tab="kardex" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'kardex' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'kardex' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px;">
            ${Icons.fileText(15)} ${isBasic ? 'Movimientos de Stock' : 'Kardex de Movimientos'}
          </button>
          <button type="button" class="inv-tab-btn ${this.activeTab === 'ajustes' ? 'active' : ''}" data-tab="ajustes" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'ajustes' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'ajustes' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px;">
            ${Icons.ajustes(15)} ${isBasic ? 'Cuadre Físico' : 'Ajustes & Cuadres Físicos'}
          </button>
          ${hasMultiBodega ? `
            <button type="button" class="inv-tab-btn ${this.activeTab === 'bodegas' ? 'active' : ''}" data-tab="bodegas" style="padding: 10px 18px; background: none; border: none; border-bottom: 3px solid ${this.activeTab === 'bodegas' ? '#2563eb' : 'transparent'}; font-size: 14px; font-weight: 700; color: ${this.activeTab === 'bodegas' ? '#2563eb' : 'var(--text-muted)'}; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px;">
              ${Icons.building(15)} Bodegas & Ubicaciones
            </button>
          ` : ''}
        </div>

        <!-- Contenedor Dinámico -->
        <div id="inv-tab-content">
          ${this.isLoading ? `
            <div style="padding: 60px; text-align: center; color: var(--text-muted);">
              Cargando catálogo y existencias en tiempo real...
            </div>
          ` : this.renderCurrentTab()}
        </div>
      </div>

      <!-- Modal: Crear / Editar Producto -->
      <div id="modal-producto-backdrop" class="inv-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2200; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 18px;">
            <h3 id="modal-prod-title" style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">Registrar Nuevo Producto</h3>
            <button type="button" class="close-modal-btn" style="background: var(--bg-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <form id="form-crear-producto">
            <div style="display: grid; grid-template-columns: ${hasDian ? '1fr 1fr 2fr' : '1fr 2fr'}; gap: 12px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">${hasDian ? 'SKU / Código *' : 'Código (opcional)'}</label>
                <input type="text" id="prod-codigo" ${hasDian ? 'required' : ''} placeholder="Ej: CAF-500" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 700; box-sizing: border-box;">
              </div>
              ${hasDian ? `
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Código Barras</label>
                  <input type="text" id="prod-barcode" placeholder="EAN-13 opcional" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); box-sizing: border-box;">
                </div>
              ` : ''}
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Nombre del Producto *</label>
                <input type="text" id="prod-nombre" required placeholder="Ej: Café Especial 500g" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600; box-sizing: border-box;">
              </div>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Descripción corta</label>
              <input type="text" id="prod-descripcion" placeholder="Detalles, presentación o especificaciones..." style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); box-sizing: border-box;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Categoría *</label>
                <select id="prod-categoria" required style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); box-sizing: border-box;">
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Unidad de Medida (Colombia) *</label>
                <select id="prod-unidad" required style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); box-sizing: border-box;">
                  <option value="UNIDAD">Unidad / Pieza</option>
                  <option value="KG_GRAMOS">Kilogramo / Gramo</option>
                  <option value="LITRO_ML">Litro / Mililitro</option>
                  <option value="PORCION">Porción / Ración</option>
                  <option value="CAJA">Caja</option>
                  <option value="PAQUETE">Paquete</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: ${hasDian ? '1fr 1fr 1fr' : '1fr 1fr'}; gap: 12px; margin-bottom: 8px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Costo Unitario ($)</label>
                <input type="number" id="prod-costo" min="0" step="any" value="0" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Precio Venta ($) *</label>
                <input type="number" id="prod-precio" required min="0" step="any" placeholder="5000" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: #059669; font-weight: 800; box-sizing: border-box;">
              </div>
              ${hasDian ? `
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Impuesto DIAN</label>
                  <select id="prod-impuesto" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); box-sizing: border-box;">
                    <option value="EXCLUIDO">Excluido / Exento (0%)</option>
                    <option value="INC_8">Impoconsumo (8%)</option>
                    <option value="IVA_19">IVA General (19%)</option>
                    <option value="IVA_5">IVA Reducido (5%)</option>
                  </select>
                </div>
              ` : ''}
            </div>
            <div id="prod-margen-preview" style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 14px; min-height: 16px;"></div>

            <div style="margin-bottom: 14px; background: rgba(37, 99, 235, 0.08); border: 1px dashed rgba(37, 99, 235, 0.4); border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" id="prod-es-servicio" style="width: 18px; height: 18px; cursor: pointer; accent-color: #2563eb;">
              <label for="prod-es-servicio" style="font-size: 13px; font-weight: 700; color: var(--text-main); cursor: pointer;">
                Es un Servicio / Mano de Obra (No descuenta stock físico ni genera alertas)
              </label>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;" id="prod-stock-inputs-row">
              <div id="prod-stock-inicial-wrapper">
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Stock Inicial (Bodega Activa)</label>
                <input type="number" id="prod-stock-inicial" min="0" step="any" value="0" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 700; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Stock Mínimo (Alerta)</label>
                <input type="number" id="prod-stock-minimo" min="0" step="any" value="5" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); box-sizing: border-box;">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-producto" style="padding: 10px 22px; border-radius: 10px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); display: inline-flex; align-items: center; gap: 6px;">
                ${Icons.save(15)} Guardar Producto
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Movimiento Rápido de Stock (Entrada / Salida / Merma) -->
      <div id="modal-movimiento-backdrop" class="inv-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2200; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 540px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 18px;">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 8px;">
              ${Icons.download(18)} Registrar Movimiento en Kardex
            </h3>
            <button type="button" class="close-modal-btn" style="background: var(--bg-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <form id="form-movimiento-rapido">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Tipo de Movimiento *</label>
              <select id="mov-tipo" required style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 700; box-sizing: border-box;">
                <option value="ENTRADA">ENTRADA — Compra o ingreso de mercancía (+)</option>
                <option value="SALIDA">SALIDA — Consumo interno o retiro de bodega (-)</option>
                <option value="AJUSTE_NEGATIVO">AJUSTE_NEGATIVO — Merma, daño o pérdida (-)</option>
                <option value="DEVOLUCION">DEVOLUCION — Reingreso de cliente (+)</option>
              </select>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Producto Físico *</label>
              <select id="mov-producto" required style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600; box-sizing: border-box;">
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Cantidad *</label>
                <input type="number" id="mov-cantidad" required min="0.01" step="any" value="1" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: #059669; font-size: 16px; font-weight: 800; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Costo Unitario ($)</label>
                <input type="number" id="mov-costo" min="0" step="any" placeholder="0" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600; box-sizing: border-box;">
              </div>
            </div>

            <div style="margin-bottom: 18px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Notas / Documento o Motivo</label>
              <input type="text" id="mov-notas" placeholder="Ej: Factura proveedor #451 o motivo de merma" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); box-sizing: border-box;">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-movimiento" style="padding: 10px 22px; border-radius: 10px; border: none; background: #059669; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); display: inline-flex; align-items: center; gap: 6px;">
                ${Icons.save(15)} Asentar en Kardex
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Conteo Físico / Cuadre de Inventario -->
      <div id="modal-ajuste-backdrop" class="inv-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2200; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 18px;">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 8px;">
              ${Icons.fileText(18)} Nuevo Conteo Físico / Ajuste de Inventario
            </h3>
            <button type="button" class="close-modal-btn" style="background: var(--bg-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <form id="form-crear-ajuste">
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-bottom: 16px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Tipo de Ajuste *</label>
                <select id="ajuste-tipo" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600; box-sizing: border-box;">
                  <option value="CONTEO_FISICO">Conteo Físico</option>
                  <option value="MERMA">Merma / Deterioro</option>
                  <option value="ROTURA">Rotura / Daño</option>
                  <option value="VENCIMIENTO">Vencimiento</option>
                  <option value="OTRO">Otro Ajuste</option>
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Observaciones</label>
                <input type="text" id="ajuste-obs" placeholder="Ej: Conteo cierre de jornada" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); box-sizing: border-box;">
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <select id="ajuste-add-prod-select" style="flex: 1; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600;">
              </select>
              <button type="button" id="btn-add-ajuste-item" style="background: #2563eb; color: #fff; border: none; padding: 9px 16px; border-radius: 10px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                + Agregar Ítem
              </button>
            </div>

            <div id="ajuste-items-container" style="border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden; margin-bottom: 18px;">
              <!-- Dinámico -->
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-ajuste" style="padding: 10px 22px; border-radius: 10px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                Crear Borrador de Ajuste
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Crear Nueva Bodega -->
      <div id="modal-bodega-backdrop" class="inv-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 2200; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); padding: 26px 30px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 18px;">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">Registrar Nueva Bodega</h3>
            <button type="button" class="close-modal-btn" style="background: var(--bg-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 15px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <form id="form-crear-bodega">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Nombre de la Bodega *</label>
              <input type="text" id="bod-nombre" required placeholder="Ej: Bodega Cocina / Depósito Norte" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 600; box-sizing: border-box;">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Código *</label>
                <input type="text" id="bod-codigo" required placeholder="Ej: BOD-02" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-weight: 700; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Tipo</label>
                <select id="bod-tipo" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); box-sizing: border-box;">
                  <option value="PRINCIPAL">Principal</option>
                  <option value="MATERIA_PRIMA">Materia Prima / Cocina</option>
                  <option value="TRANSITO">En Tránsito</option>
                  <option value="DEVOLUCIONES">Devoluciones</option>
                </select>
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <button type="button" class="close-modal-btn" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-bodega" style="padding: 10px 22px; border-radius: 10px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; cursor: pointer;">
                Guardar Bodega
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

  static getFilteredCatalogo() {
    let filtered = this.productos;

    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(q))
      );
    }

    if (this.selectedCategoria !== 'TODAS') {
      filtered = filtered.filter(p => p.categoriaId === this.selectedCategoria);
    }

    if (this.filterStockBajo) {
      filtered = filtered.filter(p => !p.esServicio && Number(p.stockActual || 0) <= Number(p.stockMinimo || 5));
    }

    return filtered;
  }

  static renderCatalogoRowsHTML() {
    const filtered = this.getFilteredCatalogo();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.catalogPageSize));
    const validPage = Math.min(this.catalogPage, totalPages);
    const paged = filtered.slice((validPage - 1) * this.catalogPageSize, validPage * this.catalogPageSize);

    if (paged.length === 0) {
      return `
        <tr>
          <td colspan="9" style="padding: 46px; text-align: center; color: var(--text-muted);">
            <div style="margin-bottom: 8px;">${Icons.package(32)}</div>
            <div style="font-size: 15px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">No se encontraron productos</div>
            <div style="font-size: 13px;">Ajusta los filtros de búsqueda o registra un nuevo producto.</div>
          </td>
        </tr>
      `;
    }

    return paged.map(p => {
      const isServicio = Boolean(p.esServicio);
      const stock = Number(p.stockActual || 0);
      const min = Number(p.stockMinimo || 5);
      const isLow = !isServicio && stock <= min;
      const cat = this.categorias.find(c => c.id === p.categoriaId);
      const codigoMostrar = p.sku || p.codigoBarras || 'S/C';
      const costo = Number(p.costo || 0);
      const precio = Number(p.precioBase || 0);
      const margen = precio > 0 && costo > 0 ? Math.round(((precio - costo) / precio) * 100) : null;

      return `
        <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s;" onmouseover="this.style.background='var(--bg-subtle)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 12px 14px; font-family: monospace; font-weight: 700; color: var(--text-muted); font-size: 12px;">${this.escapeHtml(codigoMostrar)}</td>
          <td style="padding: 12px 14px;">
            <div style="font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
              <span>${this.escapeHtml(p.nombre)}</span>
              ${isServicio ? `<span style="font-size: 10px; font-weight: 800; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 6px; padding: 1px 6px;">SERVICIO</span>` : ''}
            </div>
            ${p.descripcion ? `<div style="font-size: 11px; color: var(--text-muted); max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(p.descripcion)}</div>` : ''}
          </td>
          <td style="padding: 12px 14px;">
            <span class="badge" style="background: var(--bg-subtle); color: var(--text-main); font-weight: 600;">${this.escapeHtml(cat ? cat.nombre : 'General')}</span>
          </td>
          <td style="padding: 12px 14px; color: var(--text-muted); font-size: 12px;">${this.escapeHtml(p.unidadMedida || 'UNIDAD')}</td>
          <td style="padding: 12px 14px; text-align: right; color: var(--text-muted);">${this.formatMoney(costo)}</td>
          <td style="padding: 12px 14px; text-align: right; font-weight: 800; color: #059669;">${this.formatMoney(precio)}</td>
          <td style="padding: 12px 14px; text-align: center;">
            ${margen !== null ? `
              <span style="font-size: 11px; font-weight: 700; color: ${margen < 15 ? '#dc2626' : '#059669'}; background: ${margen < 15 ? '#fef2f2' : '#ecfdf5'}; padding: 2px 7px; border-radius: 6px;">
                ${margen}%
              </span>
            ` : `<span style="font-size: 11px; color: var(--text-muted);">—</span>`}
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            ${isServicio ? `
              <span class="badge" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-weight: 800;">N/A</span>
            ` : `
              <span class="badge" style="${
                isLow
                  ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: 800;'
                  : 'background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-weight: 800;'
              }">
                ${stock}${isLow ? ' (Bajo)' : ''}
              </span>
            `}
          </td>
          <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
            <div style="display: inline-flex; gap: 6px; align-items: center;">
              ${!isServicio ? `
                <button type="button" class="btn-recargar-stock" data-id="${p.id}" title="Registrar movimiento de stock" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 5px 9px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;">
                  + Stock
                </button>
              ` : ''}
              <button type="button" class="btn-editar-producto" data-id="${p.id}" title="Editar producto" style="background: var(--bg-subtle); color: var(--text-main); border: 1px solid var(--border-subtle); padding: 5px 8px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center;">
                ${Icons.edit(13)}
              </button>
              <button type="button" class="btn-eliminar-producto" data-id="${p.id}" data-nombre="${this.escapeHtml(p.nombre)}" title="Desactivar producto" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 5px 8px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center;">
                ${Icons.trash(13)}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  static renderCatalogoPaginationHTML() {
    const filtered = this.getFilteredCatalogo();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.catalogPageSize));
    const validPage = Math.min(this.catalogPage, totalPages);

    if (totalPages <= 1) {
      return `<span style="font-size: 12px; color: var(--text-muted);">Mostrando ${filtered.length} producto${filtered.length !== 1 ? 's' : ''}</span>`;
    }

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 10px;">
        <span style="font-size: 12px; color: var(--text-muted);">Página ${validPage} de ${totalPages} (${filtered.length} productos)</span>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="inv-page-btn" data-page="${validPage - 1}" ${validPage <= 1 ? 'disabled' : ''} style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-size: 12px; font-weight: 600; cursor: ${validPage <= 1 ? 'not-allowed' : 'pointer'}; opacity: ${validPage <= 1 ? '0.5' : '1'};">Anterior</button>
          <button type="button" class="inv-page-btn" data-page="${validPage + 1}" ${validPage >= totalPages ? 'disabled' : ''} style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-size: 12px; font-weight: 600; cursor: ${validPage >= totalPages ? 'not-allowed' : 'pointer'}; opacity: ${validPage >= totalPages ? '0.5' : '1'};">Siguiente</button>
        </div>
      </div>
    `;
  }

  static renderCatalogoTab() {
    return `
      <div>
        <!-- Barra de Búsqueda y Filtros -->
        <div style="display: flex; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="display: flex; gap: 10px; flex: 1; min-width: 280px; max-width: 560px; flex-wrap: wrap;">
            <div style="position: relative; flex: 1; min-width: 200px;">
              <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; display: flex;">${Icons.search(15)}</span>
              <input type="text" id="inv-search-input" value="${this.escapeHtml(this.searchTerm)}" placeholder="Buscar por nombre, SKU o código de barras..." style="width: 100%; padding: 10px 14px 10px 34px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); box-sizing: border-box;">
            </div>
            <select id="inv-filter-cat" style="padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600;">
              <option value="TODAS">Todas las Categorías</option>
              ${this.categorias.map(c => `
                <option value="${c.id}" ${this.selectedCategoria === c.id ? 'selected' : ''}>${this.escapeHtml(c.nombre)}</option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: ${this.filterStockBajo ? '#dc2626' : 'var(--text-muted)'}; cursor: pointer;">
              <input type="checkbox" id="check-stock-bajo" ${this.filterStockBajo ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #dc2626;">
              <span>Solo Alertas de Stock Bajo</span>
            </label>
          </div>
        </div>

        <!-- Tabla de Productos -->
        <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); overflow: hidden; box-shadow: var(--shadow-sm);">
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
              <thead>
                <tr style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                  <th style="padding: 12px 14px;">SKU / Código</th>
                  <th style="padding: 12px 14px;">Producto</th>
                  <th style="padding: 12px 14px;">Categoría</th>
                  <th style="padding: 12px 14px;">Unidad</th>
                  <th style="padding: 12px 14px; text-align: right;">Costo</th>
                  <th style="padding: 12px 14px; text-align: right;">Precio Venta</th>
                  <th style="padding: 12px 14px; text-align: center;">Margen</th>
                  <th style="padding: 12px 14px; text-align: center;">Stock</th>
                  <th style="padding: 12px 14px; text-align: center;">Acciones</th>
                </tr>
              </thead>
              <tbody id="inv-catalog-tbody">
                ${this.renderCatalogoRowsHTML()}
              </tbody>
            </table>
          </div>
          <div id="inv-catalog-pagination" style="padding: 12px 16px; border-top: 1px solid var(--border-subtle); background: var(--bg-subtle); display: flex; align-items: center;">
            ${this.renderCatalogoPaginationHTML()}
          </div>
        </div>
      </div>
    `;
  }

  static renderKardexTab() {
    const { isBasic } = this.getPlanCapabilities();
    let filtered = this.kardex || [];
    if (this.kardexFilterTipo !== 'TODOS') {
      filtered = filtered.filter(m => m.tipo === this.kardexFilterTipo);
    }
    if (this.kardexFilterProducto !== 'TODOS') {
      filtered = filtered.filter(m => (m.productoId || m.producto_id) === this.kardexFilterProducto);
    }

    return `
      <div style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); overflow: hidden; box-shadow: var(--shadow-sm);">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 8px;">${Icons.fileText(16)} ${isBasic ? 'Historial de Entradas y Salidas' : 'Historial Inmutable de Kardex'}</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">${isBasic ? 'Control ágil de ingresos, ventas y salidas de mercancía.' : 'Trazabilidad cronológica con saldo anterior y nuevo por cada movimiento.'}</p>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <select id="kardex-filter-tipo" style="padding: 7px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-size: 12px; font-weight: 600;">
              <option value="TODOS">Todos los tipos</option>
              <option value="ENTRADA" ${this.kardexFilterTipo === 'ENTRADA' ? 'selected' : ''}>ENTRADA</option>
              <option value="VENTA" ${this.kardexFilterTipo === 'VENTA' ? 'selected' : ''}>VENTA</option>
              <option value="SALIDA" ${this.kardexFilterTipo === 'SALIDA' ? 'selected' : ''}>SALIDA</option>
              <option value="AJUSTE_POSITIVO" ${this.kardexFilterTipo === 'AJUSTE_POSITIVO' ? 'selected' : ''}>AJUSTE (+)</option>
              <option value="AJUSTE_NEGATIVO" ${this.kardexFilterTipo === 'AJUSTE_NEGATIVO' ? 'selected' : ''}>MERMA / AJUSTE (-)</option>
            </select>

            <select id="kardex-filter-prod" style="padding: 7px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-size: 12px; font-weight: 600; max-width: 200px;">
              <option value="TODOS">Todos los productos</option>
              ${this.productos.filter(p => !p.esServicio).map(p => `
                <option value="${p.id}" ${this.kardexFilterProducto === p.id ? 'selected' : ''}>${this.escapeHtml(p.nombre)}</option>
              `).join('')}
            </select>

            <button type="button" id="btn-nuevo-mov-kardex" style="background: #059669; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
              + Asentar Movimiento
            </button>
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            No hay movimientos registrados en el Kardex con los filtros actuales.
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
                  <th style="padding: 10px 14px; text-align: center;">Saldo (Ant → Nuevo)</th>
                  <th style="padding: 10px 14px; text-align: right;">Costo Unit.</th>
                  <th style="padding: 10px 14px;">Notas</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(m => {
                  const isEntrada = ['ENTRADA', 'COMPRA', 'AJUSTE_POSITIVO', 'TRASLADO_ENTRADA', 'DEVOLUCION'].includes(m.tipo);
                  const isSalida = ['VENTA', 'SALIDA', 'MERMA', 'AJUSTE_NEGATIVO', 'TRASLADO_SALIDA'].includes(m.tipo);
                  const fechaRaw = m.fecha || m.createdAt || m.created_at;
                  const saldoAnt = m.saldoAnterior ?? m.saldo_anterior ?? '-';
                  const saldoNvo = m.saldoNuevo ?? m.saldo_nuevo ?? '-';

                  return `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 10px 14px; color: var(--text-muted); white-space: nowrap;">${fechaRaw ? new Date(fechaRaw).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                      <td style="padding: 10px 14px;">
                        <span class="badge" style="${
                          isEntrada
                            ? 'background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;'
                            : (isSalida ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #eff6ff; color: #2563eb;')
                        } font-weight: 800; font-size: 10px;">
                          ${this.escapeHtml(m.tipo)}
                        </span>
                      </td>
                      <td style="padding: 10px 14px; font-weight: 700; color: var(--text-main);">${this.escapeHtml(m.productoNombre || m.producto_nombre || m.producto_id || 'Ítem')}</td>
                      <td style="padding: 10px 14px; font-family: monospace; color: var(--text-muted);">${this.escapeHtml(m.referenciaDocumento || m.referencia_documento || 'DIRECTO')}</td>
                      <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: ${isEntrada ? '#059669' : '#dc2626'};">
                        ${isEntrada ? '+' : '-'}${Math.abs(Number(m.cantidad || 0))}
                      </td>
                      <td style="padding: 10px 14px; text-align: center; font-family: monospace; color: var(--text-muted);">
                        ${saldoAnt} → <strong style="color: var(--text-main);">${saldoNvo}</strong>
                      </td>
                      <td style="padding: 10px 14px; text-align: right; color: var(--text-muted);">${this.formatMoney(m.costoUnitario || m.costo_unitario || 0)}</td>
                      <td style="padding: 10px 14px; color: var(--text-muted); font-size: 11px;">${this.escapeHtml(m.notas || 'Sin observaciones')}</td>
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
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 8px;">${Icons.fileText(16)} Cuadres Físicos & Ajustes de Inventario</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">Registra conteos reales en bodega, revisa diferencias y confirma para ajustar el Kardex.</p>
          </div>
          <button type="button" id="btn-iniciar-cuadre" style="background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;">
            + Iniciar Conteo Físico
          </button>
        </div>

        ${this.ajustes.length === 0 ? `
          <div style="background: var(--bg-subtle); border-radius: 12px; padding: 36px; border: 1px dashed var(--border-subtle); text-align: center;">
            <div style="display: flex; justify-content: center; margin-bottom: 8px; color: var(--text-muted);">${Icons.fileText(32)}</div>
            <h4 style="font-size: 14px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">Sin ajustes registrados</h4>
            <p style="font-size: 12px; color: var(--text-muted); max-width: 440px; margin: 0 auto;">
              Inicia un conteo físico para conciliar sobrantes o faltantes entre el inventario real y el sistema.
            </p>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
              <thead>
                <tr style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 10px 14px;">Número</th>
                  <th style="padding: 10px 14px;">Tipo</th>
                  <th style="padding: 10px 14px;">Estado</th>
                  <th style="padding: 10px 14px;">Observaciones</th>
                  <th style="padding: 10px 14px;">Fecha</th>
                  <th style="padding: 10px 14px; text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${this.ajustes.map(aj => {
                  const est = aj.estado || 'PENDIENTE';
                  const badgeStyle = est === 'CONFIRMADO'
                    ? 'background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;'
                    : (est === 'REVERTIDO' ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #fffbeb; color: #d97706; border: 1px solid #fde68a;');

                  return `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 10px 14px; font-family: monospace; font-weight: 800; color: var(--text-main);">${this.escapeHtml(aj.numero)}</td>
                      <td style="padding: 10px 14px; font-weight: 600;">${this.escapeHtml(aj.tipo)}</td>
                      <td style="padding: 10px 14px;"><span class="badge" style="${badgeStyle} font-weight: 800; font-size: 10px;">${est}</span></td>
                      <td style="padding: 10px 14px; color: var(--text-muted);">${this.escapeHtml(aj.observaciones || 'Sin observaciones')}</td>
                      <td style="padding: 10px 14px; color: var(--text-muted);">${aj.createdAt ? new Date(aj.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                      <td style="padding: 10px 14px; text-align: right; white-space: nowrap;">
                        ${est === 'PENDIENTE' ? `
                          <button type="button" class="btn-confirmar-ajuste" data-id="${aj.id}" style="background: #059669; color: #fff; border: none; padding: 6px 12px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;">
                            Confirmar y Aplicar
                          </button>
                        ` : (est === 'CONFIRMADO' ? `
                          <button type="button" class="btn-revertir-ajuste" data-id="${aj.id}" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 6px 12px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;">
                            Revertir
                          </button>
                        ` : '<span style="color: var(--text-muted); font-size: 11px;">Revertido</span>')}
                      </td>
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

  static renderBodegasTab() {
    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Gestiona las ubicaciones físicas donde almacenas o despachas tu inventario.</p>
          <button type="button" id="btn-nueva-bodega" style="background: #2563eb; color: #fff; border: none; padding: 9px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">
            + Nueva Bodega
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
          ${this.bodegas.map(b => {
            const isActive = this.selectedBodegaId === b.id;
            return `
              <div style="background: var(--bg-card); border: 1px solid ${isActive ? '#2563eb' : 'var(--border-subtle)'}; border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <span style="display: inline-flex; color: #2563eb;">${Icons.building(22)}</span>
                    <div style="display: flex; gap: 6px; align-items: center;">
                      ${isActive ? `<span class="badge" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-weight: 800; font-size: 10px;">ACTIVA EN VISTA</span>` : ''}
                      <span class="badge" style="background: #ecfdf5; color: #059669; font-weight: 700; font-size: 11px;">
                        ${this.escapeHtml(b.codigo || 'BOD-01')}
                      </span>
                    </div>
                  </div>
                  <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">${this.escapeHtml(b.nombre)}</h3>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0;">Tipo: ${this.escapeHtml(b.tipo || 'PRINCIPAL')}</p>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #059669; font-weight: 700;">● Operativa</span>
                  ${!isActive ? `
                    <button type="button" class="btn-activar-bodega" data-id="${b.id}" style="background: var(--bg-subtle); color: var(--text-main); border: 1px solid var(--border-subtle); padding: 5px 10px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;">
                      Seleccionar Bodega
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  static async loadInitialData() {
    this.isLoading = true;
    try {
      const [prodsRes, catsRes, bodsRes, sucsRes] = await Promise.all([
        ApiClient.listProductos({ limit: 100 }),
        ApiClient.listCategorias(),
        ApiClient.listBodegas(),
        ApiClient.listSucursales().catch(() => null),
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
      if (sucsRes && sucsRes.success) {
        this.sucursales = sucsRes.data || [];
      }

      await this.loadBodegaScopedData();
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

  static async loadBodegaScopedData() {
    const [kardexRes, ajustesRes] = await Promise.all([
      ApiClient.getKardex({ bodegaId: this.selectedBodegaId || undefined, limit: 100 }).catch(() => null),
      ApiClient.listAjustesInventario().catch(() => null),
    ]);

    if (kardexRes && kardexRes.success) {
      this.kardex = kardexRes.data || [];
    }
    if (ajustesRes && ajustesRes.success) {
      const allAjustes = ajustesRes.data || [];
      this.ajustes = this.selectedBodegaId
        ? allAjustes.filter(a => a.bodegaId === this.selectedBodegaId || a.bodega_id === this.selectedBodegaId)
        : allAjustes;
    }
  }

  static updateStatsUI() {
    const elProds = document.getElementById('stat-total-prods');
    const elSubProds = document.getElementById('stat-sub-prods');
    const elValor = document.getElementById('stat-valor-stock');
    const elStock = document.getElementById('stat-total-stock');
    const elBajo = document.getElementById('stat-stock-bajo');
    const selectBodega = document.getElementById('select-bodega-activa');

    const serviciosCount = this.productos.filter(p => p.esServicio).length;
    const fisicosCount = this.productos.length - serviciosCount;
    const totalStock = this.productos.reduce((acc, p) => acc + (p.esServicio ? 0 : Number(p.stockActual || 0)), 0);
    const totalValor = this.productos.reduce((acc, p) => acc + (p.esServicio ? 0 : Number(p.stockActual || 0) * Number(p.costo || 0)), 0);
    const bajoStock = this.productos.filter(p => !p.esServicio && Number(p.stockActual || 0) <= Number(p.stockMinimo || 5)).length;

    if (elProds) elProds.textContent = String(this.productos.length);
    if (elSubProds) elSubProds.textContent = `${fisicosCount} físicos · ${serviciosCount} servicios`;
    if (elValor) elValor.textContent = this.formatMoney(totalValor);
    if (elStock) elStock.textContent = `${totalStock.toLocaleString('es-CO')} unidades en catálogo`;
    if (elBajo) elBajo.textContent = String(bajoStock);

    if (selectBodega && this.bodegas.length > 0) {
      selectBodega.innerHTML = this.bodegas.map(b => `
        <option value="${b.id}" ${this.selectedBodegaId === b.id ? 'selected' : ''}>${this.escapeHtml(b.nombre)}</option>
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

    // Cambio de Bodega Activa
    const selectBodega = document.getElementById('select-bodega-activa');
    if (selectBodega) {
      selectBodega.addEventListener('change', async (e) => {
        this.selectedBodegaId = e.target.value;
        await this.loadBodegaScopedData();
        const content = document.getElementById('inv-tab-content');
        if (content) {
          content.innerHTML = this.renderCurrentTab();
          this.bindDynamicEvents();
        }
      });
    }

    // Card Stock Bajo clicable
    const cardBajo = document.getElementById('card-stock-bajo-trigger');
    if (cardBajo) {
      cardBajo.addEventListener('click', () => {
        this.activeTab = 'catalogo';
        this.filterStockBajo = !this.filterStockBajo;
        this.catalogPage = 1;
        this.render();
        this.updateStatsUI();
      });
    }

    // Botón Refresh
    const btnRefresh = document.getElementById('btn-refresh-inv');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadInitialData());
    }

    // Modal Nuevo Producto
    const btnNuevoProd = document.getElementById('btn-nuevo-producto');
    if (btnNuevoProd) {
      btnNuevoProd.addEventListener('click', () => this.openProductoModal(null));
    }

    // Vista previa en vivo del margen de ganancia en el modal de producto
    const inputCosto = document.getElementById('prod-costo');
    const inputPrecio = document.getElementById('prod-precio');
    const updateMargenPreview = () => {
      const preview = document.getElementById('prod-margen-preview');
      if (!preview) return;
      const c = Number(inputCosto?.value || 0);
      const p = Number(inputPrecio?.value || 0);
      if (p <= 0) {
        preview.textContent = '';
        return;
      }
      if (c > 0) {
        const diff = p - c;
        const pct = Math.round((diff / p) * 100);
        preview.style.color = diff < 0 ? '#dc2626' : '#059669';
        preview.textContent = diff < 0
          ? `Advertencia: Precio por debajo del costo (pérdida de ${this.formatMoney(Math.abs(diff))})`
          : `Margen estimado: ${pct}% (${this.formatMoney(diff)} de utilidad bruta por unidad)`;
      } else {
        preview.style.color = 'var(--text-muted)';
        preview.textContent = 'Ingresa el costo unitario para calcular el margen de ganancia.';
      }
    };
    inputCosto?.addEventListener('input', updateMargenPreview);
    inputPrecio?.addEventListener('input', updateMargenPreview);

    // Toggle de servicio en creación/edición
    const checkServicioEl = document.getElementById('prod-es-servicio');
    if (checkServicioEl) {
      checkServicioEl.addEventListener('change', (e) => {
        const isS = e.target.checked;
        const row = document.getElementById('prod-stock-inputs-row');
        const stInit = document.getElementById('prod-stock-inicial');
        const stMin = document.getElementById('prod-stock-minimo');
        if (row && stInit && stMin) {
          if (isS) {
            stInit.value = '0';
            stMin.value = '0';
            stInit.disabled = true;
            stMin.disabled = true;
            row.style.opacity = '0.4';
          } else {
            stInit.disabled = Boolean(this.editingProductoId);
            stMin.disabled = false;
            if (!this.editingProductoId && stMin.value === '0') stMin.value = '5';
            row.style.opacity = '1';
          }
        }
      });
    }

    // Modal Movimiento Rápido
    const btnMovRapido = document.getElementById('btn-movimiento-rapido');
    if (btnMovRapido) {
      btnMovRapido.addEventListener('click', () => this.openMovimientoModal());
    }

    // Cambio de producto en modal movimiento precarga el costo actual
    const movProdSelect = document.getElementById('mov-producto');
    if (movProdSelect) {
      movProdSelect.addEventListener('change', (e) => {
        const prod = this.productos.find(p => p.id === e.target.value);
        const movCosto = document.getElementById('mov-costo');
        if (prod && movCosto) {
          movCosto.value = prod.costo || 0;
        }
      });
    }

    // Cerrar Modales (botón cerrar, cancelar, clic fuera en el backdrop y tecla Escape)
    const invModalIds = [
      'modal-producto-backdrop',
      'modal-movimiento-backdrop',
      'modal-ajuste-backdrop',
      'modal-bodega-backdrop',
    ];
    const closeAllInvModals = () => {
      invModalIds.forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = 'none';
      });
    };

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', closeAllInvModals);
    });

    invModalIds.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.style.display = 'none';
        });
      }
    });

    // Enviar Formulario Crear / Editar Producto
    const formProd = document.getElementById('form-crear-producto');
    if (formProd) {
      formProd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-producto');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        try {
          const sku = document.getElementById('prod-codigo').value.trim();
          const codigoBarras = document.getElementById('prod-barcode')?.value?.trim() || '';
          const nombre = document.getElementById('prod-nombre').value.trim();
          const descripcion = document.getElementById('prod-descripcion').value.trim();
          const categoriaId = document.getElementById('prod-categoria').value;
          const unidadMedida = document.getElementById('prod-unidad').value;
          const costo = Number(document.getElementById('prod-costo').value || 0);
          const precioBase = Number(document.getElementById('prod-precio').value || 0);
          const tipoImpuesto = document.getElementById('prod-impuesto')?.value || 'EXCLUIDO';
          const stockInicial = Number(document.getElementById('prod-stock-inicial').value || 0);
          const stockMinimo = Number(document.getElementById('prod-stock-minimo').value || 5);
          const esServicio = Boolean(document.getElementById('prod-es-servicio')?.checked);

          const payload = {
            sku,
            codigoBarras: codigoBarras || undefined,
            nombre,
            descripcion: descripcion || undefined,
            categoriaId,
            unidadMedida,
            costo,
            precioBase,
            tipoImpuesto,
            stockMinimo: esServicio ? 0 : stockMinimo,
            esServicio,
          };

          if (this.editingProductoId) {
            const res = await ApiClient.updateProducto(this.editingProductoId, payload);
            if (res.success) {
              document.getElementById('modal-producto-backdrop').style.display = 'none';
              formProd.reset();
              this.editingProductoId = null;
              await this.loadInitialData();
            }
          } else {
            const res = await ApiClient.createProducto({
              ...payload,
              stockInicial: esServicio ? 0 : stockInicial,
              bodegaId: this.selectedBodegaId || this.bodegas[0]?.id,
            });
            if (res.success) {
              document.getElementById('modal-producto-backdrop').style.display = 'none';
              formProd.reset();
              await this.loadInitialData();
            }
          }
        } catch (err) {
          alert(`Error al guardar producto: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `${Icons.save(15)} Guardar Producto`;
        }
      });
    }

    // Enviar Formulario Movimiento (Entrada / Salida / Merma)
    const formMov = document.getElementById('form-movimiento-rapido');
    if (formMov) {
      formMov.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-movimiento');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Asentando...';

        try {
          const tipo = document.getElementById('mov-tipo').value;
          const productoId = document.getElementById('mov-producto').value;
          const cantidad = Number(document.getElementById('mov-cantidad').value || 0);
          const costoUnitario = Number(document.getElementById('mov-costo').value || 0);
          const notas = document.getElementById('mov-notas').value.trim();

          if (!productoId) throw new Error('Selecciona un producto físico.');
          if (cantidad <= 0) throw new Error('La cantidad debe ser mayor a cero.');

          const prod = this.productos.find(p => p.id === productoId);
          if ((tipo === 'SALIDA' || tipo === 'AJUSTE_NEGATIVO') && prod && Number(prod.stockActual || 0) < cantidad) {
            throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stockActual || 0}.`);
          }

          const res = await ApiClient.registrarMovimientoInventario({
            productoId,
            bodegaId: this.selectedBodegaId || this.bodegas[0]?.id,
            tipo,
            cantidad,
            costoUnitario,
            notas: notas || `Movimiento manual (${tipo})`,
          });

          if (res.success) {
            document.getElementById('modal-movimiento-backdrop').style.display = 'none';
            formMov.reset();
            await this.loadInitialData();
          }
        } catch (err) {
          alert(`Error al registrar movimiento: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `${Icons.save(15)} Asentar en Kardex`;
        }
      });
    }

    // Agregar ítem al cuadre físico
    const btnAddItemCuadre = document.getElementById('btn-add-ajuste-item');
    if (btnAddItemCuadre) {
      btnAddItemCuadre.addEventListener('click', () => {
        const sel = document.getElementById('ajuste-add-prod-select');
        const prodId = sel?.value;
        if (!prodId) return;
        if (this.cuadreItems.some(i => i.productoId === prodId)) return;
        const prod = this.productos.find(p => p.id === prodId);
        if (!prod) return;

        this.cuadreItems.push({
          productoId: prod.id,
          nombre: prod.nombre,
          sistema: Number(prod.stockActual || 0),
          fisica: Number(prod.stockActual || 0),
          costoUnitario: Number(prod.costo || 0),
        });
        this.renderCuadreItemsTable();
      });
    }

    // Enviar Formulario Crear Ajuste
    const formAjuste = document.getElementById('form-crear-ajuste');
    if (formAjuste) {
      formAjuste.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (this.cuadreItems.length === 0) {
          alert('Agrega al menos un producto al conteo físico.');
          return;
        }
        const btn = document.getElementById('btn-submit-ajuste');
        btn.disabled = true;
        btn.textContent = 'Creando borrador...';
        try {
          const tipo = document.getElementById('ajuste-tipo').value;
          const observaciones = document.getElementById('ajuste-obs').value.trim();
          const res = await ApiClient.createAjusteInventario({
            bodegaId: this.selectedBodegaId || this.bodegas[0]?.id,
            tipo,
            observaciones: observaciones || 'Conteo físico desde panel de inventario',
            creadoPor: state.currentUser?.nombre || 'administrador',
            items: this.cuadreItems.map(i => ({
              productoId: i.productoId,
              cantidadFisica: Number(i.fisica),
              costoUnitario: i.costoUnitario,
            })),
          });
          if (res.success) {
            document.getElementById('modal-ajuste-backdrop').style.display = 'none';
            this.cuadreItems = [];
            await this.loadInitialData();
          }
        } catch (err) {
          alert(`Error al crear ajuste: ${err.message}`);
        } finally {
          btn.disabled = false;
          btn.textContent = 'Crear Borrador de Ajuste';
        }
      });
    }

    // Enviar Formulario Crear Bodega
    const formBodega = document.getElementById('form-crear-bodega');
    if (formBodega) {
      formBodega.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-bodega');
        btn.disabled = true;
        btn.textContent = 'Guardando...';
        try {
          const nombre = document.getElementById('bod-nombre').value.trim();
          const codigo = document.getElementById('bod-codigo').value.trim();
          const tipo = document.getElementById('bod-tipo').value;
          const sucursalId = this.bodegas[0]?.sucursalId || this.sucursales[0]?.id || state.currentSucursal?.id;

          if (!sucursalId) {
            throw new Error('No se encontró una sucursal activa para asociar la bodega.');
          }

          const res = await ApiClient.createBodega({ sucursalId, nombre, codigo, tipo });
          if (res.success) {
            document.getElementById('modal-bodega-backdrop').style.display = 'none';
            formBodega.reset();
            await this.loadInitialData();
          }
        } catch (err) {
          alert(`Error al crear bodega: ${err.message}`);
        } finally {
          btn.disabled = false;
          btn.textContent = 'Guardar Bodega';
        }
      });
    }

    this.bindDynamicEvents();
  }

  static openProductoModal(producto = null) {
    const modal = document.getElementById('modal-producto-backdrop');
    const title = document.getElementById('modal-prod-title');
    const selCat = document.getElementById('prod-categoria');
    const form = document.getElementById('form-crear-producto');
    if (!modal || !form) return;

    this.editingProductoId = producto ? producto.id : null;
    if (title) title.textContent = producto ? `Editar Producto: ${producto.nombre}` : 'Registrar Nuevo Producto';

    if (selCat) {
      selCat.innerHTML = this.categorias.map(c => `
        <option value="${c.id}">${this.escapeHtml(c.nombre)}</option>
      `).join('');
    }

    const stockInicialWrap = document.getElementById('prod-stock-inicial-wrapper');
    const checkServicio = document.getElementById('prod-es-servicio');
    const row = document.getElementById('prod-stock-inputs-row');
    const stInit = document.getElementById('prod-stock-inicial');
    const stMin = document.getElementById('prod-stock-minimo');

    if (producto) {
      document.getElementById('prod-codigo').value = producto.sku || '';
      const elBarcode = document.getElementById('prod-barcode');
      if (elBarcode) elBarcode.value = producto.codigoBarras || '';
      document.getElementById('prod-nombre').value = producto.nombre || '';
      document.getElementById('prod-descripcion').value = producto.descripcion || '';
      if (selCat && producto.categoriaId) selCat.value = producto.categoriaId;
      document.getElementById('prod-unidad').value = producto.unidadMedida || 'UNIDAD';
      document.getElementById('prod-costo').value = producto.costo ?? 0;
      document.getElementById('prod-precio').value = producto.precioBase ?? 0;
      const elImpuesto = document.getElementById('prod-impuesto');
      if (elImpuesto) elImpuesto.value = producto.tipoImpuesto || 'EXCLUIDO';

      const isS = Boolean(producto.esServicio);
      if (checkServicio) checkServicio.checked = isS;
      if (stockInicialWrap) stockInicialWrap.style.display = 'none';
      if (stInit) { stInit.disabled = true; stInit.value = producto.stockActual ?? 0; }
      if (stMin) { stMin.disabled = isS; stMin.value = producto.stockMinimo ?? 5; }
      if (row) row.style.opacity = isS ? '0.4' : '1';
    } else {
      form.reset();
      if (stockInicialWrap) stockInicialWrap.style.display = 'block';
      if (checkServicio) checkServicio.checked = false;
      if (row) row.style.opacity = '1';
      if (stInit) { stInit.disabled = false; stInit.value = '0'; }
      if (stMin) { stMin.disabled = false; stMin.value = '5'; }
    }

    // Disparar cálculo de margen inicial
    document.getElementById('prod-precio')?.dispatchEvent(new Event('input'));
    modal.style.display = 'flex';
  }

  static openMovimientoModal(selectedProdId = null) {
    const modal = document.getElementById('modal-movimiento-backdrop');
    const selProd = document.getElementById('mov-producto');
    const movCosto = document.getElementById('mov-costo');
    const fisicos = this.productos.filter(p => !p.esServicio);

    if (selProd) {
      if (fisicos.length === 0) {
        selProd.innerHTML = `<option value="">No hay productos físicos registrados</option>`;
      } else {
        selProd.innerHTML = fisicos.map(p => `
          <option value="${p.id}" ${selectedProdId === p.id ? 'selected' : ''}>
            ${this.escapeHtml(p.nombre)} (Stock: ${p.stockActual || 0} ${p.unidadMedida || 'UNID'})
          </option>
        `).join('');
        const targetProd = fisicos.find(p => p.id === (selectedProdId || fisicos[0].id));
        if (targetProd && movCosto) {
          movCosto.value = targetProd.costo || 0;
        }
      }
    }
    if (modal) modal.style.display = 'flex';
  }

  static openAjusteModal() {
    const modal = document.getElementById('modal-ajuste-backdrop');
    const sel = document.getElementById('ajuste-add-prod-select');
    const fisicos = this.productos.filter(p => !p.esServicio);

    if (sel) {
      sel.innerHTML = fisicos.map(p => `
        <option value="${p.id}">${this.escapeHtml(p.nombre)} (Sistema: ${p.stockActual || 0})</option>
      `).join('');
    }
    this.cuadreItems = [];
    this.renderCuadreItemsTable();
    if (modal) modal.style.display = 'flex';
  }

  static renderCuadreItemsTable() {
    const container = document.getElementById('ajuste-items-container');
    if (!container) return;

    if (this.cuadreItems.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 12px;">
          Selecciona productos arriba y pulsa "+ Agregar Ítem" para iniciar el conteo.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
        <thead>
          <tr style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle); color: var(--text-muted);">
            <th style="padding: 8px 12px;">Producto</th>
            <th style="padding: 8px 12px; text-align: center;">Sistema</th>
            <th style="padding: 8px 12px; text-align: center;">Conteo Físico</th>
            <th style="padding: 8px 12px; text-align: center;">Diferencia</th>
            <th style="padding: 8px 12px;"></th>
          </tr>
        </thead>
        <tbody>
          ${this.cuadreItems.map((item, idx) => {
            const diff = Number(item.fisica) - Number(item.sistema);
            return `
              <tr style="border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 8px 12px; font-weight: 700;">${this.escapeHtml(item.nombre)}</td>
                <td style="padding: 8px 12px; text-align: center; color: var(--text-muted);">${item.sistema}</td>
                <td style="padding: 8px 12px; text-align: center;">
                  <input type="number" min="0" step="any" class="cuadre-fisica-input" data-idx="${idx}" value="${item.fisica}" style="width: 80px; padding: 5px 8px; border-radius: 6px; border: 1px solid var(--border-subtle); text-align: center; font-weight: 700;">
                </td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 800; color: ${diff === 0 ? 'var(--text-muted)' : (diff > 0 ? '#059669' : '#dc2626')};">
                  ${diff > 0 ? '+' : ''}${diff}
                </td>
                <td style="padding: 8px 12px; text-align: right;">
                  <button type="button" class="btn-rm-cuadre-item" data-idx="${idx}" style="background: none; border: none; color: #dc2626; cursor: pointer; font-weight: 700;">✕</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.cuadre-fisica-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = Number(inp.getAttribute('data-idx'));
        this.cuadreItems[idx].fisica = Number(e.target.value || 0);
        const row = inp.closest('tr');
        const diffCell = row?.children[3];
        if (diffCell) {
          const diff = this.cuadreItems[idx].fisica - this.cuadreItems[idx].sistema;
          diffCell.style.color = diff === 0 ? 'var(--text-muted)' : (diff > 0 ? '#059669' : '#dc2626');
          diffCell.textContent = `${diff > 0 ? '+' : ''}${diff}`;
        }
      });
    });

    container.querySelectorAll('.btn-rm-cuadre-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        this.cuadreItems.splice(idx, 1);
        this.renderCuadreItemsTable();
      });
    });
  }

  static refreshCatalogTableOnly() {
    const tbody = document.getElementById('inv-catalog-tbody');
    const pag = document.getElementById('inv-catalog-pagination');
    if (tbody) tbody.innerHTML = this.renderCatalogoRowsHTML();
    if (pag) pag.innerHTML = this.renderCatalogoPaginationHTML();
    this.bindCatalogRowActions();
  }

  static bindCatalogRowActions() {
    document.querySelectorAll('.btn-recargar-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openMovimientoModal(btn.getAttribute('data-id'));
      });
    });

    document.querySelectorAll('.btn-editar-producto').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = this.productos.find(p => p.id === btn.getAttribute('data-id'));
        if (prod) this.openProductoModal(prod);
      });
    });

    document.querySelectorAll('.btn-eliminar-producto').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const nombre = btn.getAttribute('data-nombre');
        if (!confirm(`¿Desactivar el producto "${nombre}" del catálogo activo?`)) return;
        try {
          await ApiClient.deleteProducto(id);
          await this.loadInitialData();
        } catch (err) {
          alert(`Error al desactivar producto: ${err.message}`);
        }
      });
    });

    document.querySelectorAll('.inv-page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.catalogPage = Number(btn.getAttribute('data-page') || 1);
        this.refreshCatalogTableOnly();
      });
    });
  }

  static bindDynamicEvents() {
    // Buscador en Catálogo (sin perder foco al escribir)
    const searchInput = document.getElementById('inv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.catalogPage = 1;
        this.refreshCatalogTableOnly();
      });
    }

    // Filtro Categoría
    const filterCat = document.getElementById('inv-filter-cat');
    if (filterCat) {
      filterCat.addEventListener('change', (e) => {
        this.selectedCategoria = e.target.value;
        this.catalogPage = 1;
        this.refreshCatalogTableOnly();
      });
    }

    // Checkbox Stock Bajo
    const checkBajo = document.getElementById('check-stock-bajo');
    if (checkBajo) {
      checkBajo.addEventListener('change', (e) => {
        this.filterStockBajo = e.target.checked;
        this.catalogPage = 1;
        this.refreshCatalogTableOnly();
      });
    }

    this.bindCatalogRowActions();

    // Kardex filtros y botón asentar movimiento
    document.getElementById('kardex-filter-tipo')?.addEventListener('change', (e) => {
      this.kardexFilterTipo = e.target.value;
      const content = document.getElementById('inv-tab-content');
      if (content) {
        content.innerHTML = this.renderCurrentTab();
        this.bindDynamicEvents();
      }
    });

    document.getElementById('kardex-filter-prod')?.addEventListener('change', (e) => {
      this.kardexFilterProducto = e.target.value;
      const content = document.getElementById('inv-tab-content');
      if (content) {
        content.innerHTML = this.renderCurrentTab();
        this.bindDynamicEvents();
      }
    });

    document.getElementById('btn-nuevo-mov-kardex')?.addEventListener('click', () => {
      this.openMovimientoModal();
    });

    // Ajustes y Cuadres Físicos
    document.getElementById('btn-iniciar-cuadre')?.addEventListener('click', () => {
      this.openAjusteModal();
    });

    document.querySelectorAll('.btn-confirmar-ajuste').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Confirmar este ajuste y aplicar los cambios de stock al Kardex?')) return;
        try {
          await ApiClient.confirmarAjusteInventario(btn.getAttribute('data-id'));
          await this.loadInitialData();
        } catch (err) {
          alert(`Error al confirmar ajuste: ${err.message}`);
        }
      });
    });

    document.querySelectorAll('.btn-revertir-ajuste').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Revertir este ajuste y restaurar los saldos anteriores en el Kardex?')) return;
        try {
          await ApiClient.revertirAjusteInventario(btn.getAttribute('data-id'));
          await this.loadInitialData();
        } catch (err) {
          alert(`Error al revertir ajuste: ${err.message}`);
        }
      });
    });

    // Bodegas
    document.getElementById('btn-nueva-bodega')?.addEventListener('click', () => {
      const m = document.getElementById('modal-bodega-backdrop');
      if (m) m.style.display = 'flex';
    });

    document.querySelectorAll('.btn-activar-bodega').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.selectedBodegaId = btn.getAttribute('data-id');
        this.updateStatsUI();
        await this.loadBodegaScopedData();
        const content = document.getElementById('inv-tab-content');
        if (content) {
          content.innerHTML = this.renderCurrentTab();
          this.bindDynamicEvents();
        }
      });
    });
  }
}
