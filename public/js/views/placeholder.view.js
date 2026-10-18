/**
 * VISTA PARA MÓDULOS EN DESARROLLO (CLIENTES, INVENTARIO, REPORTES)
 * Especifica con claridad que es un entorno de desarrollo y presenta datos base precargados.
 */

import { state } from '../state.js';

export class PlaceholderView {
  static mount(container, moduleName) {
    this.container = container;
    this.moduleName = moduleName;
    this.render();
  }

  static render() {
    const config = this.getModuleConfig(this.moduleName);

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Banner de Funcionalidad No Operativa -->
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: #991b1b;">
            <span style="font-size: 22px;">🛠️</span>
            <div>
              <b>MÓDULO EN DESARROLLO — FUNCIONALIDAD NO OPERATIVA</b>
              <div style="font-size: 12px; opacity: 0.9;">
                Esta pantalla contiene datos de prueba demostrativos. La lógica transaccional de ${config.title} está programada para la siguiente fase.
              </div>
            </div>
          </div>
          <span style="background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
            Modo Visual
          </span>
        </div>

        <!-- Tarjeta de Contenido con Datos de Muestra -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 24px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 26px;">${config.icon}</span>
              <div>
                <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main);">${config.title}</h3>
                <p style="font-size: 13px; color: var(--text-muted);">${config.desc} · ${state.currentTenant.name}</p>
              </div>
            </div>

            <button class="btn-primary" onclick="alert('Funcionalidad en desarrollo.')" disabled style="opacity: 0.6; cursor: not-allowed;">
              + ${config.actionBtn}
            </button>
          </div>

          <!-- Malla o Vista Previa del Módulo -->
          ${config.renderBody()}
        </div>
      </div>
    `;
  }

  static getModuleConfig(name) {
    switch (name) {
      case 'clientes':
        return {
          title: 'Directorio de Clientes & Proveedores (CRM)',
          icon: '👥',
          desc: 'Base de datos universal de terceros con validación de RUT y NIT',
          actionBtn: 'Nuevo Cliente',
          renderBody: () => `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 10px;">Documento</th>
                  <th style="padding: 10px;">Razón Social / Nombre</th>
                  <th style="padding: 10px;">Email</th>
                  <th style="padding: 10px;">Tipo</th>
                  <th style="padding: 10px;">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 10px; font-family: monospace; font-weight: 600;">900.123.456-7</td>
                  <td style="padding: 12px 10px; font-weight: 600;">Grupo Empresarial Torres S.A.S.</td>
                  <td style="padding: 12px 10px; color: #64748b;">pagos@grupotorres.com</td>
                  <td style="padding: 12px 10px;"><span class="badge badge-pagada">Cliente VIP</span></td>
                  <td style="padding: 12px 10px; color: #059669; font-weight: 600;">Al Día</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 10px; font-family: monospace; font-weight: 600;">800.987.654-3</td>
                  <td style="padding: 12px 10px; font-weight: 600;">Distribuidora Andina Ltda.</td>
                  <td style="padding: 12px 10px; color: #64748b;">contabilidad@andina.com.co</td>
                  <td style="padding: 12px 10px;"><span class="badge badge-pendiente">Cliente Crédito</span></td>
                  <td style="padding: 12px 10px; color: #d97706; font-weight: 600;">Pendiente $14.8M</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 10px; font-family: monospace; font-weight: 600;">901.555.777-2</td>
                  <td style="padding: 12px 10px; font-weight: 600;">Constructora Bogotá S.A.</td>
                  <td style="padding: 12px 10px; color: #64748b;">facturas@constructora.com</td>
                  <td style="padding: 12px 10px;"><span class="badge badge-rechazada">Bloqueado DIAN</span></td>
                  <td style="padding: 12px 10px; color: #dc2626; font-weight: 600;">Revisión Legal</td>
                </tr>
              </tbody>
            </table>
          `,
        };

      case 'inventario':
        return {
          title: 'Gestión de Inventario & Kardex Multibodega',
          icon: '📦',
          desc: 'Control de existencias, costos promedio ponderado y alertas de reposición',
          actionBtn: 'Ajuste de Stock',
          renderBody: () => `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                <span style="font-size: 11px; color: #64748b;">VALORIZACIÓN TOTAL INVENTARIO</span>
                <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">$ 84.320.000 COP</div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                <span style="font-size: 11px; color: #64748b;">ÍTEMS BAJO STOCK MÍNIMO</span>
                <div style="font-size: 20px; font-weight: 800; color: #d97706; margin-top: 4px;">4 Referencias</div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                <span style="font-size: 11px; color: #64748b;">MERMAS REGISTRADAS DEL MES</span>
                <div style="font-size: 20px; font-weight: 800; color: #dc2626; margin-top: 4px;">0.8% (Óptimo)</div>
              </div>
            </div>
            <p style="text-align: center; color: #64748b; font-size: 12px; padding: 10px;">
              Kardex enlazado con la base de datos de ${state.currentTenant.name}. Los movimientos de caja POS descuentan inventario automáticamente.
            </p>
          `,
        };

      case 'reportes':
      default:
        return {
          title: 'Inteligencia de Negocio & Reportes Ejecutivos',
          icon: '📊',
          desc: 'Informes de rentabilidad, ventas por turnos, colaboradores y productos estrella',
          actionBtn: 'Generar Reporte',
          renderBody: () => `
            <div style="text-align: center; padding: 40px 20px; color: #64748b;">
              <span style="font-size: 48px; display: block; margin-bottom: 12px;">📊</span>
              <p style="font-size: 15px; font-weight: 700; color: #0f172a;">Motor de Analítica Q4 en Construcción</p>
              <p style="font-size: 13px; max-width: 480px; margin: 8px auto;">
                Próximamente disponible: Reportes de flujo de caja libre, rentabilidad neta por producto y exportación a Excel y PowerBI.
              </p>
            </div>
          `,
        };
    }
  }
}
