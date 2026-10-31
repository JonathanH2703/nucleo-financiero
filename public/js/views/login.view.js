/**
 * VISTA DE INICIO DE SESIÓN UNIFICADA (NIT + PIN) — NÚCLEO FINANCIERO
 * Acceso corporativo limpio por NIT de empresa y PIN (admin de empresa o sucursal),
 * más acceso maestro de Administrador del Sistema y carrusel informativo/publicitario lateral.
 */

import { state } from '../state.js';
import { ApiClient } from '../api.js';

export class LoginView {
  static mount(container) {
    this.container = container;
    this.currentSlide = 0;
    this.carouselTimer = null;
    this.showNumpad = false;
    this.render();
  }

  static render() {
    this.container.innerHTML = `
      <div class="login-page-container">
        <!-- COLUMNA IZQUIERDA: Branding y Carrusel (Sistema + Publicidad Hipotética) -->
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
              Gestión contable, facturación electrónica DIAN, inventarios y terminales de venta con aislamiento estricto de datos en la nube.
            </p>

            <!-- CARRUSEL LATERAL INTERACTIVO -->
            <div class="login-carousel-wrapper" id="login-carousel">
              <!-- Slide 1: Sistema - Core ERP -->
              <div class="login-carousel-slide active" data-slide="0">
                <div class="carousel-tag sistema">🏛️ SISTEMA · CORE FINANCIERO</div>
                <h3 class="carousel-title">Aislamiento Multi-Tenant & Contabilidad NIIF</h3>
                <p class="carousel-desc">
                  Tus datos financieros y contables aislados por esquema PostgreSQL, libro diario automático, balance de comprobación y PUC colombiano oficial.
                </p>
                <div class="carousel-highlight">
                  ✓ PUC oficial · Conciliación bancaria · Reportes fiscales en tiempo real
                </div>
              </div>

              <!-- Slide 2: Publicidad - Pasarelas y Datáfonos -->
              <div class="login-carousel-slide" data-slide="1">
                <div class="carousel-tag publicidad">📢 PUBLICIDAD · PASARELAS & DATÁFONOS</div>
                <h3 class="carousel-title">Alianza FinTech: Datáfonos Móviles con 0% de Comisión</h3>
                <p class="carousel-desc">
                  Recibe pagos con tarjetas débito/crédito y transferencias QR en tu punto de venta con liquidación inmediata de fondos en tu cuenta bancaria.
                </p>
                <div class="carousel-highlight ad">
                  🎁 \$150.000 COP de bienvenida en comisiones de adquirencia para comercios
                </div>
              </div>

              <!-- Slide 3: Sistema - Multi-Sucursal y Kardex -->
              <div class="login-carousel-slide" data-slide="2">
                <div class="carousel-tag sistema">📦 SISTEMA · MULTI-SUCURSAL & KARDEX</div>
                <h3 class="carousel-title">Control Multi-Sucursal y Bodegas Independientes</h3>
                <p class="carousel-desc">
                  Cada sede ingresa con su propio PIN exclusivo para operar la caja. Kardex permanente, alertas de stock mínimo y trazabilidad de lotes con vencimiento.
                </p>
                <div class="carousel-highlight">
                  ✓ PIN por sucursal · Existencias por bodega · Mermas y traslados
                </div>
              </div>

              <!-- Slide 4: Publicidad - Firma Digital y DIAN -->
              <div class="login-carousel-slide" data-slide="3">
                <div class="carousel-tag publicidad">⚡ PUBLICIDAD · SERVICIOS ALIADOS</div>
                <h3 class="carousel-title">Firma Digital y Certificado DIAN Incluidos</h3>
                <p class="carousel-desc">
                  Emite facturas electrónicas y notas crédito validadas ante la DIAN sin comprar certificados digitales externos ni pagar por paquetes de folios adicionales.
                </p>
                <div class="carousel-highlight ad">
                  📑 Emisión y validación previa automática ante la DIAN en 2 segundos
                </div>
              </div>

              <!-- Controles del Carrusel -->
              <div class="carousel-controls">
                <button type="button" class="carousel-nav-btn" id="btn-carousel-prev" title="Anterior">‹</button>
                <div class="carousel-dots" id="carousel-dots">
                  <span class="carousel-dot active" data-index="0"></span>
                  <span class="carousel-dot" data-index="1"></span>
                  <span class="carousel-dot" data-index="2"></span>
                  <span class="carousel-dot" data-index="3"></span>
                </div>
                <button type="button" class="carousel-nav-btn" id="btn-carousel-next" title="Siguiente">›</button>
              </div>
            </div>
          </div>

          <div class="login-certifications">
            <span class="cert-badge"><span class="check">✓</span> ISO 27001</span>
            <span class="cert-badge"><span class="check">✓</span> DIAN Habilitado</span>
            <span class="cert-badge"><span class="check">✓</span> Encriptación AES-256</span>
            <span class="cert-badge"><span class="check">✓</span> Multi-Tenant Schema</span>
          </div>
        </div>

        <!-- COLUMNA DERECHA: Formulario Ultra-Limpio (NIT + PIN) -->
        <div class="login-form-side">
          <div class="login-form-card">
            <!-- Branding visible en móvil/tablet -->
            <div class="login-mobile-brand">
              <div class="login-brand-logo-icon">🏛️</div>
              <div class="login-brand-logo-text">
                <h2>Núcleo Financiero</h2>
                <p>Claridad Empresarial</p>
              </div>
            </div>

            <div class="login-form-header">
              <h2 class="login-form-title">Iniciar Sesión</h2>
              <p class="login-form-subtitle">Ingresa el NIT de tu empresa y tu PIN de acceso corporativo</p>
            </div>

            <!-- Alerta de Error / Éxito -->
            <div id="login-alert" class="login-alert" style="display: none;"></div>

            <!-- Formulario Principal -->
            <form id="login-form">
              <!-- NIT de la Empresa -->
              <div class="form-group">
                <label class="form-label" for="nit-input">
                  <span>🏢 NIT de la Empresa</span>
                  <span style="font-size: 11px; color: #2563eb; font-weight: 600;">Colombia</span>
                </label>
                <input 
                  type="text" 
                  id="nit-input" 
                  class="form-input" 
                  placeholder="Ej: 901.445.772-0" 
                  value="901.445.772-0" 
                  required 
                  autofocus
                  autocomplete="organization"
                >
              </div>

              <!-- PIN de Acceso -->
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" for="pin-input" style="margin-bottom: 0;">
                    <span>🔑 PIN de Acceso</span>
                  </label>
                  <button type="button" id="btn-toggle-numpad" style="background: none; border: none; font-size: 12px; color: #2563eb; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                    🔢 Teclado táctil
                  </button>
                </div>
                <div class="password-input-wrapper">
                  <input 
                    type="password" 
                    id="pin-input" 
                    class="form-input" 
                    placeholder="••••" 
                    maxlength="6" 
                    value="123456" 
                    style="font-size: 22px; letter-spacing: 8px; text-align: center; font-weight: 800;" 
                    required
                    autocomplete="current-password"
                  >
                  <button type="button" id="toggle-password-btn" class="password-toggle-btn">👁️</button>
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
                  💡 Accede con el <b>PIN de administración</b> o con el <b>PIN de tu sucursal</b>.
                </div>
              </div>

              <!-- Teclado Numérico Táctil Opcional -->
              <div id="pin-numpad-container" class="pin-numpad" style="display: ${this.showNumpad ? 'grid' : 'none'}; margin: 14px 0 18px 0;">
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

              <button type="submit" id="btn-submit" class="btn-submit-login">
                🔒 Ingresar al Sistema ➔
              </button>
            </form>

            <!-- Acceso Administrador del Sistema -->
            <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid var(--border-subtle); text-align: center;">
              <button type="button" id="btn-open-master-admin" style="background: none; border: none; font-size: 13px; color: #64748b; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; transition: all 0.2s ease;">
                <span>🛡️</span> Acceso Administrador del Sistema (Plataforma)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL ACCESO ADMINISTRADOR DEL SISTEMA -->
      <div id="modal-master-admin-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 2200; padding: 20px;">
        <div style="background: var(--bg-card); border-radius: 18px; width: 100%; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); padding: 28px; border: 1px solid var(--border-subtle); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: #fef3c7; color: #b45309; display: flex; align-items: center; justify-content: center; font-size: 20px;">🛡️</div>
              <div>
                <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0;">Administrador del Sistema</h3>
                <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">Panel Maestro Multi-Tenant</p>
              </div>
            </div>
            <button type="button" id="btn-close-master-modal" style="background: var(--bg-subtle); border: none; width: 30px; height: 30px; border-radius: 50%; font-size: 14px; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 18px;">
            Este acceso está reservado exclusivamente para la administración global de la plataforma, creación de empresas y aprovisionamiento de esquemas.
          </p>

          <form id="form-master-admin">
            <div style="margin-bottom: 20px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">PIN Maestro de Plataforma *</label>
              <input 
                type="password" 
                id="master-pin-input" 
                placeholder="••••••" 
                maxlength="6" 
                value="999999"
                required 
                style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-subtle); color: var(--text-main); font-size: 22px; letter-spacing: 8px; text-align: center; font-weight: 800;"
              >
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button type="button" id="btn-cancel-master" style="padding: 10px 16px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btn-submit-master" style="padding: 10px 20px; border-radius: 10px; border: none; background: #b45309; color: #ffffff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(180, 83, 9, 0.3);">
                🛡️ Ingresar al Panel Maestro
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
    this.startCarousel();
  }

  static startCarousel() {
    if (this.carouselTimer) clearInterval(this.carouselTimer);
    this.carouselTimer = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  static stopCarousel() {
    if (this.carouselTimer) {
      clearInterval(this.carouselTimer);
      this.carouselTimer = null;
    }
  }

  static goToSlide(index) {
    const slides = document.querySelectorAll('.login-carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    if (slides.length === 0) return;

    this.currentSlide = (index + slides.length) % slides.length;

    slides.forEach((s, i) => {
      if (i === this.currentSlide) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    dots.forEach((d, i) => {
      if (i === this.currentSlide) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });
  }

  static nextSlide() {
    this.goToSlide(this.currentSlide + 1);
  }

  static prevSlide() {
    this.goToSlide(this.currentSlide - 1);
  }

  static bindEvents() {
    const loginForm = document.getElementById('login-form');
    const pinInput = document.getElementById('pin-input');
    const nitInput = document.getElementById('nit-input');
    const togglePassBtn = document.getElementById('toggle-password-btn');
    const btnToggleNumpad = document.getElementById('btn-toggle-numpad');
    const numpadContainer = document.getElementById('pin-numpad-container');

    // Carrusel eventos
    const btnNext = document.getElementById('btn-carousel-next');
    const btnPrev = document.getElementById('btn-carousel-prev');
    const carouselWrapper = document.getElementById('login-carousel');

    if (btnNext) btnNext.addEventListener('click', () => { this.nextSlide(); this.startCarousel(); });
    if (btnPrev) btnPrev.addEventListener('click', () => { this.prevSlide(); this.startCarousel(); });

    document.querySelectorAll('.carousel-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-index'), 10);
        this.goToSlide(idx);
        this.startCarousel();
      });
    });

    if (carouselWrapper) {
      carouselWrapper.addEventListener('mouseenter', () => this.stopCarousel());
      carouselWrapper.addEventListener('mouseleave', () => this.startCarousel());
    }

    // Toggle teclado numérico táctil
    if (btnToggleNumpad && numpadContainer) {
      btnToggleNumpad.addEventListener('click', () => {
        this.showNumpad = !this.showNumpad;
        numpadContainer.style.display = this.showNumpad ? 'grid' : 'none';
      });
    }

    // Teclado virtual numérico táctil
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

    // Revelar / Ocultar PIN
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        if (pinInput.type === 'password') {
          pinInput.type = 'text';
          togglePassBtn.textContent = '🔒';
        } else {
          pinInput.type = 'password';
          togglePassBtn.textContent = '👁️';
        }
      });
    }

    // Envío del Formulario Principal NIT + PIN
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitLogin();
      });
    }

    // Modal Super Admin
    const btnOpenMaster = document.getElementById('btn-open-master-admin');
    const modalMaster = document.getElementById('modal-master-admin-backdrop');
    const btnCloseMaster = document.getElementById('btn-close-master-modal');
    const btnCancelMaster = document.getElementById('btn-cancel-master');
    const formMaster = document.getElementById('form-master-admin');

    if (btnOpenMaster && modalMaster) {
      btnOpenMaster.addEventListener('click', () => {
        modalMaster.style.display = 'flex';
      });
    }

    const closeMasterModal = () => {
      if (modalMaster) modalMaster.style.display = 'none';
    };

    if (btnCloseMaster) btnCloseMaster.addEventListener('click', closeMasterModal);
    if (btnCancelMaster) btnCancelMaster.addEventListener('click', closeMasterModal);

    if (formMaster) {
      formMaster.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = document.getElementById('master-pin-input').value.trim();
        const submitBtn = document.getElementById('btn-submit-master');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Verificando...';

        try {
          const res = await ApiClient.loginAdminSistema(pin);
          if (res.success && res.usuario) {
            closeMasterModal();
            this.handleSuccessfulAuth(res);
          }
        } catch (err) {
          alert(`❌ Error: ${err.message || 'PIN maestro inválido'}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '🛡️ Ingresar al Panel Maestro';
        }
      });
    }
  }

  static async submitLogin() {
    const alertBox = document.getElementById('login-alert');
    const submitBtn = document.getElementById('btn-submit');
    const nit = document.getElementById('nit-input').value.trim();
    const pin = document.getElementById('pin-input').value.trim();

    alertBox.className = 'login-alert';
    alertBox.style.display = 'none';

    if (!nit || !pin) {
      alertBox.className = 'login-alert error';
      alertBox.textContent = '❌ Por favor ingresa el NIT de la empresa y el PIN de acceso.';
      alertBox.style.display = 'flex';
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Verificando credenciales...';

      const res = await ApiClient.loginNitPin(nit, pin);

      if (res && res.success && res.usuario) {
        alertBox.className = 'login-alert success';
        alertBox.textContent = `✅ ${res.message}`;
        alertBox.style.display = 'flex';

        this.handleSuccessfulAuth(res);
      }
    } catch (err) {
      alertBox.className = 'login-alert error';
      alertBox.textContent = `❌ ${err.message || 'Error al iniciar sesión'}`;
      alertBox.style.display = 'flex';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '🔒 Ingresar al Sistema ➔';
    }
  }

  static handleSuccessfulAuth(res) {
    this.stopCarousel();

    // Guardar tenant en estado
    if (res.tenant) {
      state.setTenant(res.tenant);
    }

    // Configurar información de sucursal si vino en el login
    if (res.sucursal) {
      res.usuario.sucursal = res.sucursal;
      res.usuario.esSucursal = true;
    }

    // Guardar usuario en el estado
    state.setUser(res.usuario);

    // Redirección inteligente
    setTimeout(() => {
      const defaultView = state.getDefaultViewForUser();
      const defaultModule = state.getRoleDefinition()?.defaultModule || (res.usuario.esSucursal ? 'pos' : 'gestion');
      state.setModule(defaultModule);
      state.setView(defaultView);
    }, 350);
  }
}
