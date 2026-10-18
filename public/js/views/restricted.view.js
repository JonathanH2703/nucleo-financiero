/**
 * VISTA DE ACCESO DENEGADO / POLÍTICA DE SEGURIDAD RBAC — NÚCLEO FINANCIERO
 * Se muestra cuando un perfil (ej. Mesero, Cajero) intenta acceder a un módulo protegido (ej. Dashboard, Contabilidad F-350).
 */

import { state } from '../state.js';

export class RestrictedView {
  static mount(container, attemptedView = 'este módulo') {
    const user = state.currentUser || { nombre: 'Colaborador', rol: { nombre: 'Mesero / Salón' } };
    const defaultView = state.getDefaultViewForUser();
    const defaultViewLabel = defaultView === 'pos' ? 'Punto de Venta (Comandas)' : defaultView === 'dashboard' ? 'Dashboard' : 'mi vista inicial';

    container.innerHTML = `
      <div style="max-width: 680px; margin: 40px auto; padding: 32px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); text-align: center;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: #fef2f2; border: 2px solid #fecaca; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px auto;">
          🛡️
        </div>

        <span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
          Acceso Restringido por Política RBAC
        </span>

        <h2 style="font-size: 22px; font-weight: 800; color: var(--text-main); margin-top: 16px; margin-bottom: 8px;">
          Módulo No Autorizado para tu Perfil
        </h2>

        <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px;">
          Hola <b>${user.nombre}</b>. Tu rol actual de <b style="color: var(--primary-600);">${user.rol.nombre}</b> no tiene privilegios asignados para consultar la información financiera, contable o administrativa de <b>"${attemptedView}"</b>.
        </p>

        <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; text-align: left; margin-bottom: 24px; font-size: 13px;">
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
            🔒 Principio de Menor Privilegio (Seguridad Empresarial):
          </div>
          <p style="color: var(--text-muted); font-size: 12px; line-height: 1.4;">
            Núcleo Financiero aísla estrictamente el inventario general, la facturación global y las declaraciones tributarias de los roles operativos de sala para evitar fugas de información y modificaciones no auditadas.
          </p>
        </div>

        <div style="display: flex; justify-content: center; gap: 12px;">
          <button type="button" class="btn-primary" id="btn-back-to-assigned" style="padding: 10px 22px; font-size: 13px;">
            ← Ir a ${defaultViewLabel}
          </button>
        </div>
      </div>
    `;

    const btnBack = container.querySelector('#btn-back-to-assigned');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        state.setView(defaultView);
      });
    }
  }
}
