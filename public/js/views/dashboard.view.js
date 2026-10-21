/**
 * VISTA DEL DASHBOARD EJECUTIVO — NÚCLEO FINANCIERO (FIGMA DESIGN)
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

export class DashboardView {
  static async mount(container) {
    this.container = container;
    this.render();
    await this.loadFinancialSummary();
  }

  static async loadFinancialSummary() {
    try {
      const res = await ApiClient.getResumenFinanciero();
      if (res.success && res.data) {
        const d = res.data;
        const elEmitidas = document.getElementById('dash-stat-emitidas');
        const elCobradas = document.getElementById('dash-stat-cobradas');
        const elPendientes = document.getElementById('dash-stat-pendientes');

        if (elEmitidas) elEmitidas.textContent = d.facturasEsteMes || '0';
        if (elCobradas) {
          const cobradoM = (Number(d.totalCobrado || 0) / 1000000).toFixed(1);
          elCobradas.textContent = `$ ${cobradoM}M`;
        }
        if (elPendientes) {
          const pendienteM = (Number(d.cuentasPorCobrar || 0) / 1000000).toFixed(1);
          elPendientes.textContent = `$ ${pendienteM}M`;
        }
      }
    } catch (err) {
      console.warn('Dashboard: no se pudo cargar el resumen financiero:', err);
    }
  }

  static render() {
    const tenant = state.currentTenant;
    const user = state.currentUser;

    this.container.innerHTML = `
      <div class="dashboard-container">
        <!-- Fila Principal: Gráfico de Ingresos + Acciones Rápidas -->
        <div class="dashboard-main-grid">
          <!-- Tarjeta del Gráfico de Ingresos Históricos -->
          <div class="revenue-card">
            <div class="revenue-card-header">
              <div class="revenue-title-group">
                <h3>Comportamiento de Ingresos Operativos</h3>
                <p>Histórico mayo - octubre 2026 · ${tenant.name}</p>
              </div>

              <div class="revenue-legend">
                <div class="legend-item">
                  <span class="legend-dot real"></span>
                  <span>Ingresos Facturados</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot proyectado"></span>
                  <span>Presupuesto Estimado</span>
                </div>
              </div>
            </div>

            <!-- Gráfico SVG idéntico a Figma -->
            <div class="chart-wrapper">
              <svg viewBox="0 0 700 240" width="100%" height="100%" style="overflow: visible;">
                <defs>
                  <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
                  </linearGradient>
                  <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>

                <!-- Líneas Guía de Eje Y -->
                <line x1="40" y1="20" x2="680" y2="20" stroke="#f1f5f9" stroke-dasharray="4 4" stroke-width="1"/>
                <text x="32" y="24" fill="#94a3b8" font-size="10" text-anchor="end" font-family="sans-serif">$60M</text>

                <line x1="40" y1="75" x2="680" y2="75" stroke="#f1f5f9" stroke-dasharray="4 4" stroke-width="1"/>
                <text x="32" y="79" fill="#94a3b8" font-size="10" text-anchor="end" font-family="sans-serif">$40M</text>

                <line x1="40" y1="130" x2="680" y2="130" stroke="#f1f5f9" stroke-dasharray="4 4" stroke-width="1"/>
                <text x="32" y="134" fill="#94a3b8" font-size="10" text-anchor="end" font-family="sans-serif">$20M</text>

                <line x1="40" y1="185" x2="680" y2="185" stroke="#e2e8f0" stroke-width="1"/>
                <text x="32" y="189" fill="#94a3b8" font-size="10" text-anchor="end" font-family="sans-serif">$0M</text>

                <!-- Etiquetas de Meses (Eje X) -->
                <text x="50" y="210" fill="#64748b" font-size="11" font-family="sans-serif">May</text>
                <text x="175" y="210" fill="#64748b" font-size="11" font-family="sans-serif">Jun</text>
                <text x="300" y="210" fill="#64748b" font-size="11" font-family="sans-serif">Jul</text>
                <text x="425" y="210" fill="#64748b" font-size="11" font-family="sans-serif">Ago</text>
                <text x="550" y="210" fill="#64748b" font-size="11" font-family="sans-serif">Sep</text>
                <text x="670" y="210" fill="#64748b" font-size="11" font-family="sans-serif">Oct</text>

                <!-- Curva Azul: Presupuesto Estimado -->
                <path d="M 50 110 C 175 105, 300 100, 425 90 C 550 105, 620 100, 670 95 L 670 185 L 50 185 Z" fill="url(#gradBlue)" />
                <path d="M 50 110 C 175 105, 300 100, 425 90 C 550 105, 620 100, 670 95" fill="none" stroke="#2563eb" stroke-width="2.5" />

                <!-- Curva Verde: Ingresos Facturados Reales (Figma) -->
                <path d="M 50 70 C 175 60, 300 80, 425 45 C 550 48, 620 40, 670 30 L 670 185 L 50 185 Z" fill="url(#gradGreen)" />
                <path d="M 50 70 C 175 60, 300 80, 425 45 C 550 48, 620 40, 670 30" fill="none" stroke="#10b981" stroke-width="3" />

                <!-- Punto Activo en Octubre -->
                <circle cx="670" cy="30" r="5" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
              </svg>
            </div>
          </div>

          <!-- Columna Lateral: Acciones Rápidas y Estadísticas del Día -->
          <div class="dashboard-side-column">
            <!-- Acciones Rápidas (Estilo Figma) -->
            <div class="quick-actions-card">
              <a href="#" class="quick-action-item green" id="action-nueva-venta">
                <div class="action-left">
                  <span class="action-icon">💳</span>
                  <div class="action-text">
                    <h4>Nueva venta táctil</h4>
                    <p>Abrir caja y punto de venta POS</p>
                  </div>
                </div>
                <span class="action-arrow">↗</span>
              </a>

              <a href="#" class="quick-action-item blue" id="action-emitir-factura">
                <div class="action-left">
                  <span class="action-icon">📄</span>
                  <div class="action-text">
                    <h4>Emitir Factura DIAN</h4>
                    <p>Facturación electrónica directa</p>
                  </div>
                </div>
                <span class="action-arrow">↗</span>
              </a>

              <a href="#" class="quick-action-item yellow" id="action-declarar-dian">
                <div class="action-left">
                  <span class="action-icon">🏛️</span>
                  <div class="action-text">
                    <h4>Declarar DIAN</h4>
                    <p>Retenciones F-350, IVA F-300</p>
                  </div>
                </div>
                <span class="action-arrow">↗</span>
              </a>
            </div>

            <!-- Resumen de Hoy -->
            <div class="today-summary-card">
              <div class="today-header">Hoy — 09/10/2026</div>
              <div class="today-stats-grid">
                <div class="stat-box">
                  <span class="stat-value" id="dash-stat-emitidas">11</span>
                  <span class="stat-label">Facturas emitidas</span>
                </div>
                <div class="stat-box">
                  <span class="stat-value highlight" id="dash-stat-cobradas">$ 24.5M</span>
                  <span class="stat-label">Cobradas</span>
                </div>
                <div class="stat-box">
                  <span class="stat-value" id="dash-stat-pendientes" style="color: #f59e0b;">$ 4.2M</span>
                  <span class="stat-label">Pendientes</span>
                </div>
                <div class="stat-box">
                  <span class="stat-value">142</span>
                  <span class="stat-label">Clientes activos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fila Inferior: Proyección de Ingresos Q4 2026 -->
        <div class="forecast-card">
          <div class="forecast-header">
            <div>
              <h3>Proyección de Ingresos — Q4 2026</h3>
              <p>Histórico + Forecast IA · Noviembre y Diciembre proyectados</p>
            </div>
            <a href="#" class="forecast-link" onclick="alert('Pronóstico con modelo predictivo de series temporales.'); return false;">Ver análisis completo ↗</a>
          </div>

          <div class="forecast-columns">
            <div class="forecast-col-box real">
              <span class="forecast-col-status status-real">Real en Curso</span>
              <div class="forecast-col-month">Octubre 2026</div>
              <div class="forecast-col-amount">$ 38.500.000</div>
              <div class="forecast-col-meta">+14.2% vs. mes anterior</div>
            </div>

            <div class="forecast-col-box">
              <span class="forecast-col-status status-proy">Proyectado</span>
              <div class="forecast-col-month">Noviembre 2026</div>
              <div class="forecast-col-amount">$ 44.200.000</div>
              <div class="forecast-col-meta">Basado en estacionalidad anual</div>
            </div>

            <div class="forecast-col-box">
              <span class="forecast-col-status status-proy">Proyectado</span>
              <div class="forecast-col-month">Diciembre 2026</div>
              <div class="forecast-col-amount">$ 52.800.000</div>
              <div class="forecast-col-meta">Temporada alta de festividades</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  static bindEvents() {
    const btnVenta = document.getElementById('action-nueva-venta');
    const btnFactura = document.getElementById('action-emitir-factura');
    const btnDian = document.getElementById('action-declarar-dian');

    if (btnVenta) {
      btnVenta.addEventListener('click', (e) => {
        e.preventDefault();
        state.setModule('pos');
        state.setView('pos');
      });
    }

    if (btnFactura) {
      btnFactura.addEventListener('click', (e) => {
        e.preventDefault();
        state.setView('facturacion');
      });
    }

    if (btnDian) {
      btnDian.addEventListener('click', (e) => {
        e.preventDefault();
        state.setView('contabilidad');
      });
    }
  }
}
