/**
 * VISTA DE INICIO DE SESIÓN — NÚCLEO FINANCIERO (FIGMA REPLICA)
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';
import { DEMO_TENANTS } from '../demo-fixtures.js';

export class LoginView {
  static mount(container) {
    this.container = container;
    this.currentTab = 'email'; // 'email' | 'pin'
    this.render();
  }

  static render() {
    const selectedTenant = state.currentTenant;

    this.container.innerHTML = `
      <div class="login-page-container">
        <!-- COLUMNA IZQUIERDA: Propuesta de Valor y Certificaciones (Tema Figma Dark Navy) -->
        <div class="login-hero-side">
          <div class="login-brand-header">
            <div class="login-brand-logo-card">
              <div class="login-brand-logo-icon">🏛️</div>
              <div class="login-brand-logo-text">
                <h2>Núcleo Financiero</h2>
                <p>Claridad Empresarial</p>
              </div>
            </div>

            <h1 class="login-hero-headline">Tu negocio, claro.<br>Tu operación, conectada.</h1>
            <p class="login-hero-description">
              Gestión contable, facturación electrónica DIAN, inventarios y punto de venta unificados con aislamiento estricto de datos en la nube.
            </p>

            <div class="login-module-cards">
              <div class="login-module-card">
                <div class="module-card-icon gestion">🌐</div>
                <div class="module-card-info">
                  <h4>Núcleo Gestión</h4>
                  <p>Contabilidad · Facturación DIAN · Clientes CRM · Reportes</p>
                </div>
              </div>

              <div class="login-module-card">
                <div class="module-card-icon pos">☕</div>
                <div class="module-card-info">
                  <h4>Núcleo Punto de Venta</h4>
                  <p>Ventas táctiles · Comandas KDS · Mesas y Mostrador · Inventario</p>
                </div>
              </div>
            </div>
          </div>

          <div class="login-certifications">
            <span class="cert-badge"><span class="check">✓</span> ISO 27001</span>
            <span class="cert-badge"><span class="check">✓</span> DIAN Habilitado</span>
            <span class="cert-badge"><span class="check">✓</span> Encriptación AES-256</span>
            <span class="cert-badge"><span class="check">✓</span> MFA Listo</span>
            <span class="cert-badge"><span class="check">✓</span> Multi-Tenant Schema</span>
          </div>
        </div>

        <!-- COLUMNA DERECHA: Formulario de Acceso y Modo Demostración -->
        <div class="login-form-side">
          <div class="login-form-card">
            <div class="login-form-header">
              <h2 class="login-form-title">Iniciar sesión</h2>
              <p class="login-form-subtitle">Accede con tus credenciales corporativas o usa el modo de prueba</p>
            </div>

            <!-- Alerta de Error / Éxito -->
            <div id="login-alert" class="login-alert"></div>

            <!-- Selector de Método: Correo vs PIN -->
            <div class="auth-tabs-container">
              <button type="button" id="tab-btn-email" class="auth-tab-btn ${this.currentTab === 'email' ? 'active' : ''}">
                ✉ Correo y contraseña
              </button>
              <button type="button" id="tab-btn-pin" class="auth-tab-btn ${this.currentTab === 'pin' ? 'active' : ''}">
                🔑 PIN rápido
              </button>
            </div>

            <!-- Formulario Principal -->
            <form id="login-form">
              <!-- Selector de Empresa (Tenant) -->
              <div class="form-group">
                <label class="form-label" for="tenant-select">
                  <span>🏢 Empresa (Aislamiento de Negocio)</span>
                  <span style="font-size: 11px; color: #2563eb; font-weight: 600;">Multi-Tenant Activo</span>
                </label>
                <select id="tenant-select" class="form-select">
                  ${DEMO_TENANTS.map(
                    (t) => `
                    <option value="${t.slug}" ${t.slug === selectedTenant.slug ? 'selected' : ''}>
                      ${t.name} (${t.category})
                    </option>
                  `
                  ).join('')}
                </select>
              </div>

              <!-- Selector de Sucursal -->
              <div class="form-group">
                <label class="form-label" for="sucursal-select">
                  <span>📍 Sucursal / Sede</span>
                </label>
                <select id="sucursal-select" class="form-select">
                  ${selectedTenant.sucursales
                    .map(
                      (s) => `
                    <option value="${s}">${s}</option>
                  `
                    )
                    .join('')}
                </select>
              </div>

              <!-- Campos para Tab Email -->
              <div id="email-fields-group" style="display: ${this.currentTab === 'email' ? 'block' : 'none'};">
                <div class="form-group">
                  <label class="form-label" for="email-input">
                    <span>✉ Correo corporativo</span>
                  </label>
                  <input type="email" id="email-input" class="form-input" placeholder="usuario@empresa.co" value="carlos.mendoza@nucleo.co" required>
                </div>

                <div class="form-group">
                  <label class="form-label" for="password-input">
                    <span>🔒 Contraseña</span>
                    <a href="#" class="forgot-password-link" onclick="alert('En entorno de desarrollo use los botones de autocompletado demo inferiores.'); return false;">¿Olvidaste tu contraseña?</a>
                  </label>
                  <div class="password-input-wrapper">
                    <input type="password" id="password-input" class="form-input" placeholder="••••••••" value="demo123456" required>
                    <button type="button" id="toggle-password-btn" class="password-toggle-btn">👁️</button>
                  </div>
                </div>
              </div>

              <!-- Campos para Tab PIN Rápido -->
              <div id="pin-fields-group" style="display: ${this.currentTab === 'pin' ? 'block' : 'none'};">
                <div class="form-group">
                  <label class="form-label" for="pin-input">
                    <span>🔑 PIN de Seguridad Personal (6 dígitos)</span>
                  </label>
                  <input type="password" id="pin-input" class="form-input" style="font-size: 20px; letter-spacing: 8px; text-align: center;" placeholder="••••••" maxlength="6" value="123456">
                </div>

                <!-- Teclado Numérico Táctil -->
                <div class="pin-numpad">
                  <button type="button" class="numpad-btn" data-val="1">1</button>
                  <button type="button" class="numpad-btn" data-val="2">2</button>
                  <button type="button" class="numpad-btn" data-val="3">3</button>
                  <button type="button" class="numpad-btn" data-val="4">4</button>
                  <button type="button" class="numpad-btn" data-val="5">5</button>
                  <button type="button" class="numpad-btn" data-val="6">6</button>
                  <button type="button" class="numpad-btn" data-val="7">7</button>
                  <button type="button" class="numpad-btn" data-val="8">8</button>
                  <button type="button" class="numpad-btn" data-val="9">9</button>
                  <button type="button" class="numpad-btn" data-val="clear">C</button>
                  <button type="button" class="numpad-btn" data-val="0">0</button>
                  <button type="button" class="numpad-btn" data-val="back">⌫</button>
                </div>
              </div>

              <div class="form-checkbox-wrapper">
                <input type="checkbox" id="remember-session" class="form-checkbox" checked>
                <label for="remember-session" class="form-checkbox-label">Mantener sesión iniciada (8 horas)</label>
              </div>

              <button type="submit" id="btn-submit" class="btn-submit-login">
                🔒 Ingresar al sistema
              </button>
            </form>

            <!-- CAJA DE MODO DEMOSTRACIÓN (AUTOCOMPLETADO RÁPIDO) -->
            <div class="demo-mode-card">
              <div class="demo-mode-header">
                <div class="demo-mode-title">
                  <span>⚡ Modo Demostración</span>
                  <span class="demo-mode-badge">Autocompletar en 1-clic</span>
                </div>
                <span style="font-size: 11px; color: #64748b;">Prueba usuarios de <b>${selectedTenant.name.split(' ')[0]}</b></span>
              </div>

              <div class="demo-users-grid">
                ${selectedTenant.users
                  .map(
                    (u) => `
                  <button type="button" class="demo-user-btn" data-email="${u.email}" data-pin="${u.pin}" data-name="${u.nombre}">
                    <div class="demo-user-left">
                      <div class="demo-avatar">${u.avatar}</div>
                      <div>
                        <span class="demo-user-name">${u.nombre}</span>
                        <span class="demo-user-role">${u.rol}</span>
                      </div>
                    </div>
                    <span class="demo-pin-badge">PIN: ${u.pin}</span>
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  static bindEvents() {
    const tabEmail = document.getElementById('tab-btn-email');
    const tabPin = document.getElementById('tab-btn-pin');
    const emailGroup = document.getElementById('email-fields-group');
    const pinGroup = document.getElementById('pin-fields-group');
    const tenantSelect = document.getElementById('tenant-select');
    const loginForm = document.getElementById('login-form');
    const togglePassBtn = document.getElementById('toggle-password-btn');
    const passInput = document.getElementById('password-input');
    const pinInput = document.getElementById('pin-input');

    // Cambio de Pestañas
    tabEmail.addEventListener('click', () => {
      this.currentTab = 'email';
      tabEmail.classList.add('active');
      tabPin.classList.remove('active');
      emailGroup.style.display = 'block';
      pinGroup.style.display = 'none';
    });

    tabPin.addEventListener('click', () => {
      this.currentTab = 'pin';
      tabPin.classList.add('active');
      tabEmail.classList.remove('active');
      emailGroup.style.display = 'none';
      pinGroup.style.display = 'block';
    });

    // Revelar / Ocultar Contraseña
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          togglePassBtn.textContent = '🔒';
        } else {
          passInput.type = 'password';
          togglePassBtn.textContent = '👁️';
        }
      });
    }

    // Teclado Numérico Virtual para PIN
    document.querySelectorAll('.numpad-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (val === 'clear') {
          pinInput.value = '';
        } else if (val === 'back') {
          pinInput.value = pinInput.value.slice(0, -1);
        } else {
          if (pinInput.value.length < 6) {
            pinInput.value += val;
          }
        }
      });
    });

    // Cambio de Empresa (Tenant)
    tenantSelect.addEventListener('change', (e) => {
      const slug = e.target.value;
      state.setTenant(slug);
      this.render(); // Redibuja el formulario y actualiza la lista de usuarios demo
    });

    // Botones de Autocompletado Demo
    document.querySelectorAll('.demo-user-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-email');
        const pin = btn.getAttribute('data-pin');

        if (this.currentTab === 'email') {
          document.getElementById('email-input').value = email;
          document.getElementById('password-input').value = 'demo123456';
        } else {
          document.getElementById('pin-input').value = pin;
        }

        // Enviar automáticamente para mayor comodidad del usuario
        this.submitLogin();
      });
    });

    // Envío del Formulario
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitLogin();
    });
  }

  static async submitLogin() {
    const alertBox = document.getElementById('login-alert');
    const submitBtn = document.getElementById('btn-submit');
    const originalBtnText = submitBtn.innerHTML;

    alertBox.className = 'login-alert';
    alertBox.style.display = 'none';

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Conectando...';

      let result;
      if (this.currentTab === 'email') {
        const email = document.getElementById('email-input').value.trim();
        const password = document.getElementById('password-input').value;
        result = await ApiClient.loginEmail(email, password);
      } else {
        const pin = document.getElementById('pin-input').value.trim();
        result = await ApiClient.loginPin(pin);
      }

      if (result && result.success && result.usuario) {
        alertBox.className = 'login-alert success';
        alertBox.textContent = `✅ ${result.message}`;
        alertBox.style.display = 'flex';

        // Guardar usuario en el estado (normaliza rol y permisos)
        state.setUser(result.usuario);

        // Enrutamiento inteligente según política RBAC del perfil
        setTimeout(() => {
          const defaultView = state.getDefaultViewForUser();
          const defaultModule = state.getRoleDefinition()?.defaultModule || 'gestion';
          state.setModule(defaultModule);
          state.setView(defaultView);
        }, 350);
      }
    } catch (err) {
      // Fallback a fixtures si la base de datos o el endpoint no responden
      const email = document.getElementById('email-input')?.value.trim();
      const pin = document.getElementById('pin-input')?.value.trim();
      const currentTenantUsers = state.currentTenant.users || [];
      const match = currentTenantUsers.find((u) => (this.currentTab === 'email' ? u.email === email : u.pin === pin));

      if (match) {
        alertBox.className = 'login-alert success';
        alertBox.textContent = `✅ Sesión iniciada correctamente como ${match.nombre}`;
        alertBox.style.display = 'flex';

        state.setUser(match);

        setTimeout(() => {
          const defaultView = state.getDefaultViewForUser();
          const defaultModule = state.getRoleDefinition()?.defaultModule || 'gestion';
          state.setModule(defaultModule);
          state.setView(defaultView);
        }, 350);
      } else {
        alertBox.className = 'login-alert error';
        alertBox.textContent = `❌ ${err.message || 'Error al iniciar sesión'}`;
        alertBox.style.display = 'flex';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}
