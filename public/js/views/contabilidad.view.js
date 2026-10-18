/**
 * VISTA DE CONTABILIDAD Y DIAN — NÚCLEO FINANCIERO (FIGMA DESIGN)
 * Precargada con datos base de Retenciones Formulario 350 y banners de desarrollo.
 * Totalmente compatible con Modo Claro y Modo Oscuro.
 */

import { state } from '../state.js';

export class ContabilidadView {
  static mount(container) {
    this.container = container;
    this.render();
  }

  static render() {
    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Banner de Desarrollo -->
        <div style="background: var(--badge-yellow-bg); border: 1px solid var(--badge-yellow-border); border-radius: 12px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--badge-yellow-text);">
            <span style="font-size: 18px;">⚠️</span>
            <span><b>ENTORNO DE DESARROLLO:</b> Este módulo expone la interfaz visual DIAN con datos pre-cargados de prueba (Formulario 350). La liquidación automática con la DIAN se encuentra en fase de pruebas.</span>
          </div>
          <span style="background: var(--badge-yellow-bg); color: var(--badge-yellow-text); border: 1px solid var(--badge-yellow-border); padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">PRECARGADO</span>
        </div>

        <!-- Pestañas Principales (Figma) -->
        <div style="display: flex; gap: 10px; background: var(--bg-card); padding: 8px; border-radius: 12px; border: 1px solid var(--border-subtle); overflow-x: auto;">
          <button class="filter-pill active" style="background: var(--primary-600); color: white; border-color: var(--primary-600);">🏛️ Declaraciones DIAN</button>
          <button class="filter-pill">📄 Consulta Facturas</button>
          <button class="filter-pill">📈 Análisis & Forecast</button>
          <button class="filter-pill">📑 Balance General</button>
          <button class="filter-pill">📖 Asientos Contables</button>
        </div>

        <!-- Subpestañas de Formularios -->
        <div style="display: flex; gap: 8px;">
          <button class="filter-pill">IVA (F-300)</button>
          <button class="filter-pill active" style="background: var(--primary-600); color: white; border-color: var(--primary-600);">Retenciones (F-350)</button>
          <button class="filter-pill">Renta (F-110)</button>
          <button class="filter-pill">Info. Exógena</button>
        </div>

        <!-- Tarjeta Informativa de Retenciones -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 20px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span style="font-size: 20px;">🏛️</span>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">Retenciones en la Fuente — Formulario 350</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-muted);">
            Periodicidad mensual. Retenciones practicadas por salarios, honorarios, servicios, compras, arrendamientos y otros conceptos en ${state.currentTenant.name}.
          </p>
        </div>

        <!-- Tarjetas de Declaraciones F-350 -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Declaración Octubre 2026 (Borrador) -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 24px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="background: var(--primary-50); color: var(--primary-600); font-weight: 800; font-size: 13px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--primary-100);">F-350</span>
                <div>
                  <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main);">Retenciones <span class="badge badge-pendiente" style="font-size: 11px;">⏱ Borrador</span></h4>
                  <p style="font-size: 12px; color: var(--text-muted);">Período fiscal: Octubre 2026</p>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="text-align: right;">
                  <span style="font-size: 11px; color: var(--text-muted); display: block;">Total a Pagar</span>
                  <span style="font-size: 20px; font-weight: 800; color: #dc2626;">$ 1.746.000</span>
                </div>
                <button class="btn-primary" onclick="alert('En entorno de desarrollo: Preparando declaración F-350 con algoritmo tributario.')">Preparar</button>
                <button class="btn-secondary" onclick="alert('Descargando borrador XML prevalidado DIAN...')">↓ XML</button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; border-top: 1px solid var(--border-subtle); padding-top: 14px; font-size: 13px;">
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Base Gravable Acumulada</span>
                <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">$ 43.650.000</div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Impuesto Retenido</span>
                <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">$ 1.746.000</div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Sanciones</span>
                <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">—</div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Intereses</span>
                <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">—</div>
              </div>
            </div>
          </div>

          <!-- Declaración Septiembre 2026 (Aceptada) -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 24px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="background: var(--badge-gray-bg); color: var(--badge-gray-text); font-weight: 800; font-size: 13px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--badge-gray-border);">F-350</span>
                <div>
                  <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main);">Retenciones <span class="badge badge-aceptada" style="font-size: 11px;">✓ Aceptada DIAN</span></h4>
                  <p style="font-size: 12px; color: var(--text-muted);">Período fiscal: Septiembre 2026 · Presentada: 2026-10-10</p>
                  <p style="font-size: 11px; font-family: monospace; color: var(--primary-600);">CUFE: CUFE-2026-0930-DEF456</p>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="text-align: right;">
                  <span style="font-size: 11px; color: var(--text-muted); display: block;">Total Pagado</span>
                  <span style="font-size: 20px; font-weight: 800; color: #059669;">$ 1.540.000</span>
                </div>
                <button class="btn-secondary" onclick="alert('Descargando acuse de recibo oficial DIAN...')">↓ XML</button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; border-top: 1px solid var(--border-subtle); padding-top: 14px; font-size: 13px;">
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Base Gravable</span>
                <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">$ 38.500.000</div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Impuesto Liquidado</span>
                <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">$ 1.540.000</div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Sanciones</span>
                <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">—</div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Intereses</span>
                <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">—</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
