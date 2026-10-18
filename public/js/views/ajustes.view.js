/**
 * VISTA DE AJUSTES Y CONFIGURACIÓN — NÚCLEO FINANCIERO
 * Permite cambiar el tema visual (Claro, Oscuro, Sistema), configurar el POS y verificar el aislamiento multi-tenant.
 */

import { state } from '../state.js';

export class AjustesView {
  static mount(container) {
    this.container = container;
    this.render();
  }

  static render() {
    const currentThemeSetting = state.themeSetting; // 'light' | 'dark' | 'system'
    const effectiveTheme = state.getEffectiveTheme(); // 'light' | 'dark'
    const user = state.currentUser || { nombre: 'Usuario Demo', email: 'demo@nucleo.co', rol: { nombre: 'Administrador' } };
    const tenant = state.currentTenant;

    this.container.innerHTML = `
      <div style="max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; padding-bottom: 32px;">
        <!-- Encabezado de Ajustes -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px 28px; box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
              ⚙️
            </div>
            <div>
              <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin-bottom: 2px;">Ajustes del Sistema y Preferencias</h2>
              <p style="font-size: 13px; color: var(--text-muted);">Personaliza el tema visual, parámetros del Punto de Venta y opciones de entorno</p>
            </div>
          </div>
          <span class="badge" style="background: var(--primary-50); color: var(--primary-600); border: 1px solid var(--primary-100); font-size: 12px;">
            ${tenant.name}
          </span>
        </div>

        <!-- SECCIÓN 1: TEMA VISUAL DE LA PLATAFORMA (CLARO / OSCURO / SISTEMA) -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px 28px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">🎨</span>
              <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">Apariencia y Tema Visual</h3>
            </div>
            <span style="font-size: 12px; color: var(--text-muted);">
              Tema actual activo: <b style="color: var(--primary-600); text-transform: capitalize;">${effectiveTheme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</b>
            </span>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
            Selecciona la apariencia para toda la plataforma, incluyendo el Punto de Venta, paneles de gestión y facturación DIAN.
          </p>

          <!-- Tarjetas Selectoras de Tema -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
            
            <!-- Opción 1: Modo Claro -->
            <div class="theme-card-option ${currentThemeSetting === 'light' ? 'selected' : ''}" data-theme-choice="light" style="
              background: var(--bg-surface);
              border: 2px solid ${currentThemeSetting === 'light' ? 'var(--primary-600)' : 'var(--border-subtle)'};
              border-radius: var(--radius-md);
              padding: 20px;
              cursor: pointer;
              transition: all var(--transition-fast);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-shadow: ${currentThemeSetting === 'light' ? '0 4px 14px rgba(37, 99, 235, 0.2)' : 'var(--shadow-sm)'};
            ">
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <div style="font-size: 32px;">☀️</div>
                  <div style="
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid ${currentThemeSetting === 'light' ? 'var(--primary-600)' : 'var(--border-strong)'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${currentThemeSetting === 'light' ? 'var(--primary-600)' : 'transparent'};
                  ">
                    ${currentThemeSetting === 'light' ? '<span style="color: white; font-size: 11px; font-weight: bold;">✓</span>' : ''}
                  </div>
                </div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Modo Claro (Recomendado)</h4>
                <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
                  Diseño uniforme de alta claridad. Toda la interfaz (sidebar, encabezados, facturación y catálogo POS) en tonos limpios y luminosos.
                </p>
              </div>
              <div style="margin-top: 16px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; display: flex; align-items: center; gap: 6px; font-size: 11px; color: #0f172a;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #ffffff; border: 1px solid #cbd5e1;"></span>
                <span>Fondo blanco + texto oscuro</span>
              </div>
            </div>

            <!-- Opción 2: Modo Oscuro -->
            <div class="theme-card-option ${currentThemeSetting === 'dark' ? 'selected' : ''}" data-theme-choice="dark" style="
              background: var(--bg-surface);
              border: 2px solid ${currentThemeSetting === 'dark' ? 'var(--primary-600)' : 'var(--border-subtle)'};
              border-radius: var(--radius-md);
              padding: 20px;
              cursor: pointer;
              transition: all var(--transition-fast);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-shadow: ${currentThemeSetting === 'dark' ? '0 4px 14px rgba(37, 99, 235, 0.2)' : 'var(--shadow-sm)'};
            ">
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <div style="font-size: 32px;">🌙</div>
                  <div style="
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid ${currentThemeSetting === 'dark' ? 'var(--primary-600)' : 'var(--border-strong)'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${currentThemeSetting === 'dark' ? 'var(--primary-600)' : 'transparent'};
                  ">
                    ${currentThemeSetting === 'dark' ? '<span style="color: white; font-size: 11px; font-weight: bold;">✓</span>' : ''}
                  </div>
                </div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Modo Oscuro</h4>
                <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
                  Interfaz nocturna con fondo azul oscuro profundo y acentos dorados. Ideal para turnos de noche, bares o menor fatiga visual.
                </p>
              </div>
              <div style="margin-top: 16px; padding: 6px 10px; background: #0b1329; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; display: flex; align-items: center; gap: 6px; font-size: 11px; color: #f8fafc;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #1e293b; border: 1px solid rgba(255,255,255,0.2);"></span>
                <span>Fondo oscuro + texto claro</span>
              </div>
            </div>

            <!-- Opción 3: Modo Sistema / Navegador -->
            <div class="theme-card-option ${currentThemeSetting === 'system' ? 'selected' : ''}" data-theme-choice="system" style="
              background: var(--bg-surface);
              border: 2px solid ${currentThemeSetting === 'system' ? 'var(--primary-600)' : 'var(--border-subtle)'};
              border-radius: var(--radius-md);
              padding: 20px;
              cursor: pointer;
              transition: all var(--transition-fast);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-shadow: ${currentThemeSetting === 'system' ? '0 4px 14px rgba(37, 99, 235, 0.2)' : 'var(--shadow-sm)'};
            ">
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <div style="font-size: 32px;">💻</div>
                  <div style="
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid ${currentThemeSetting === 'system' ? 'var(--primary-600)' : 'var(--border-strong)'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${currentThemeSetting === 'system' ? 'var(--primary-600)' : 'transparent'};
                  ">
                    ${currentThemeSetting === 'system' ? '<span style="color: white; font-size: 11px; font-weight: bold;">✓</span>' : ''}
                  </div>
                </div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Seguir Sistema / Navegador</h4>
                <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
                  Se ajusta automáticamente según la preferencia de modo claro u oscuro que tengas configurada en tu navegador o sistema operativo.
                </p>
              </div>
              <div style="margin-top: 16px; padding: 6px 10px; background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: 6px; display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted);">
                <span>Auto-sincronizado con prefers-color-scheme</span>
              </div>
            </div>

          </div>
        </div>

        <!-- SECCIÓN 2: PARÁMETROS DEL PUNTO DE VENTA (POS) -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px 28px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 20px;">☕</span>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">Configuración de Operación del POS</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
            Control de comanda, liquidación de impuestos y periféricos para el punto de venta activo.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <div style="padding: 14px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-subtle);">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Impuesto Predeterminado</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Impoconsumo 8% (Restaurantes/Bares) o IVA 19% (Comercio)</div>
              <select style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--bg-card); color: var(--text-main); font-size: 12px;">
                <option value="8" selected>Impoconsumo 8% (Gastronomía)</option>
                <option value="19">IVA General 19% (Retail / Moda)</option>
                <option value="0">Exento / Tarifa 0%</option>
              </select>
            </div>

            <div style="padding: 14px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-subtle);">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Propina Voluntaria Sugerida</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Porcentaje aplicado automáticamente al resumen de cuenta</div>
              <select style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--bg-card); color: var(--text-main); font-size: 12px;">
                <option value="10" selected>10% (Estándar)</option>
                <option value="5">5%</option>
                <option value="0">Desactivada (0%)</option>
              </select>
            </div>

            <div style="padding: 14px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-subtle);">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Modo de Comanda por Defecto</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Vista inicial al ingresar al Punto de Venta</div>
              <select style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--bg-card); color: var(--text-main); font-size: 12px;">
                <option value="Mesa" selected>🍽️ Servicio a la Mesa</option>
                <option value="Mostrador">🛒 Mostrador / Escáner</option>
                <option value="Vitrina">🍰 Vitrina / Venta Rápida</option>
              </select>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 3: AISLAMIENTO MULTI-TENANT & POSTGRESQL -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px 28px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 20px;">🏛️</span>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">Aislamiento Multi-Tenant (PostgreSQL Neon)</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            Verificación técnica del esquema aislado y almacenamiento en bucket del establecimiento en sesión.
          </p>

          <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; font-size: 13px;">
            <div>
              <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 700;">Empresa / Razón Social:</span>
              <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">${tenant.name}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 700;">Schema PostgreSQL:</span>
              <div style="font-family: var(--font-mono); font-weight: 700; color: #2563eb; margin-top: 2px;">tenant_${tenant.slug}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 700;">NIT Fiscal:</span>
              <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">${tenant.nit}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 700;">Bucket S3 / MinIO:</span>
              <div style="font-family: var(--font-mono); font-weight: 600; color: #059669; margin-top: 2px;">tenants/${tenant.slug}/</div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 4: TU PERFIL Y ALCANCE DE PERMISOS ASIGNADOS -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px 28px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">👤</span>
              <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">Tu Perfil y Permisos Activos</h3>
            </div>
            <span class="badge" style="background: var(--primary-50); color: var(--primary-600); border: 1px solid var(--primary-100); font-weight: 700;">
              ${user.rol?.nombre || 'Colaborador'}
            </span>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            Módulos autorizados para <b>${user.nombre}</b> bajo las directrices de seguridad RBAC de ${tenant.name}:
          </p>

          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
            ${(state.getAllowedViews() || [])
              .map(
                (v) => `
              <span style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 6px 12px; border-radius: var(--radius-pill); font-size: 12px; font-weight: 700; color: var(--text-main); display: inline-flex; align-items: center; gap: 6px;">
                <span style="color: #22c55e;">✓</span> ${v.toUpperCase()}
              </span>
            `
              )
              .join('')}
          </div>

          <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px; font-size: 12px; color: var(--text-muted); line-height: 1.4;">
            💡 <b>Control de Acceso:</b> Los módulos no incluidos en esta lista (como finanzas, contabilidad o inventario general) están restringidos para este perfil operativo.
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  static bindEvents() {
    // Manejar selección de temas visuales
    this.container.querySelectorAll('.theme-card-option').forEach((card) => {
      card.addEventListener('click', () => {
        const choice = card.getAttribute('data-theme-choice');
        state.setTheme(choice);
        this.render();
      });
    });
  }
}
