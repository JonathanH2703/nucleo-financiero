/**
 * GESTOR DE ESTADO REACTIVO (STORE) — NÚCLEO FINANCIERO
 * Maneja el estado global, autenticación, control de acceso por roles (RBAC),
 * navegación protegida por perfiles, carrito POS y motor de temas.
 */

import { DEMO_TENANTS, ROLE_DEFINITIONS } from './demo-fixtures.js';

class AppState {
  constructor() {
    // Cargar estado inicial desde sessionStorage y localStorage
    const savedTenantSlug = sessionStorage.getItem('nf_tenant_slug') || 'restaurante_origen';
    const savedUserJson = sessionStorage.getItem('nf_user');
    const savedModule = sessionStorage.getItem('nf_module') || 'gestion';
    const savedView = sessionStorage.getItem('nf_view') || 'login';
    
    // Tema: 'light' (predeterminado "deja todo claro") | 'dark' | 'system'
    this.themeSetting = localStorage.getItem('nf_theme') || 'light';

    this.currentTenant = DEMO_TENANTS.find((t) => t.slug === savedTenantSlug) || DEMO_TENANTS[0];
    this.currentUser = savedUserJson ? JSON.parse(savedUserJson) : null;
    this.currentModule = savedModule;
    this.currentView = this.currentUser ? (savedView === 'login' ? this.getDefaultViewForUser() : savedView) : 'login';

    // Verificar si la vista guardada está permitida para el usuario cargado
    if (this.currentUser && !this.canAccessView(this.currentView)) {
      this.currentView = this.getDefaultViewForUser();
    }

    // Carrito de ventas POS
    this.cartItems = [];
    this.selectedTable = 'Mesa 02';

    // Lista de oyentes para reactividad
    this.listeners = [];

    // Inicializar y aplicar el tema
    this.initThemeSystem();
  }

  initThemeSystem() {
    this.applyTheme(this.themeSetting, false);

    // Escuchar cambios en la configuración del navegador / sistema operativo
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => {
        if (this.themeSetting === 'system') {
          const resolved = e.matches ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', resolved);
          document.body.setAttribute('data-theme', resolved);
          this.notify('theme_changed', { setting: 'system', effective: resolved });
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handler);
      }
    }
  }

  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
      theme = 'light';
    }
    this.themeSetting = theme;
    localStorage.setItem('nf_theme', theme);
    this.applyTheme(theme, true);
  }

  applyTheme(theme, notify = true) {
    let resolvedTheme = theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.setAttribute('data-theme-setting', theme);
    document.body.setAttribute('data-theme', resolvedTheme);

    if (notify) {
      this.notify('theme_changed', { setting: theme, effective: resolvedTheme });
    }
  }

  getEffectiveTheme() {
    if (this.themeSetting === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.themeSetting;
  }

  // =========================================================================
  // CONTROL DE ACCESO POR ROLES (RBAC ROUTE GUARDS)
  // =========================================================================
  getRoleSlug() {
    if (!this.currentUser) return null;
    return this.currentUser.rol?.slug || this.currentUser.rolSlug || 'mesero';
  }

  getRoleDefinition() {
    const slug = this.getRoleSlug();
    if (!slug) return null;
    return ROLE_DEFINITIONS[slug] || ROLE_DEFINITIONS.mesero;
  }

  canAccessView(viewName) {
    if (!this.currentUser) return viewName === 'login';
    if (viewName === 'login') return true;

    const slug = this.getRoleSlug();
    if (this.currentUser.esSuperAdmin || slug === 'super_admin') {
      return true; // Bypass total para Super Administrador
    }

    const roleDef = this.getRoleDefinition();
    if (!roleDef || !roleDef.allowedViews) {
      return false;
    }

    return roleDef.allowedViews.includes(viewName);
  }

  getAllowedViews() {
    if (!this.currentUser) return ['login'];
    const slug = this.getRoleSlug();
    if (this.currentUser.esSuperAdmin || slug === 'super_admin') {
      return ['dashboard', 'facturacion', 'empresas', 'pos', 'contabilidad', 'clientes', 'inventario', 'reportes', 'rbac', 'ajustes'];
    }
    const roleDef = this.getRoleDefinition();
    return roleDef?.allowedViews || ['pos', 'ajustes'];
  }

  setClienteSeleccionadoPreviamente(cliente) {
    this.clienteSeleccionadoPreviamente = cliente;
  }

  getClienteSeleccionadoPreviamente() {
    const c = this.clienteSeleccionadoPreviamente;
    this.clienteSeleccionadoPreviamente = null; // consumo único
    return c;
  }

  getDefaultViewForUser() {
    const roleDef = this.getRoleDefinition();
    return roleDef?.defaultView || 'pos';
  }

  canSwitchModule() {
    if (!this.currentUser) return false;
    const slug = this.getRoleSlug();
    if (this.currentUser.esSuperAdmin || slug === 'super_admin') return true;
    const roleDef = this.getRoleDefinition();
    return Boolean(roleDef?.canSwitchModule);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify(event, payload) {
    this.listeners.forEach((l) => l(event, payload, this));
  }

  setTenant(tenantSlug) {
    const tenant = DEMO_TENANTS.find((t) => t.slug === tenantSlug);
    if (tenant) {
      this.currentTenant = tenant;
      sessionStorage.setItem('nf_tenant_slug', tenant.slug);
      this.notify('tenant_changed', tenant);
    }
  }

  setUser(userData) {
    if (userData) {
      // Normalizar estructura del rol
      const roleSlug = userData.rol?.slug || userData.rolSlug || (typeof userData.rol === 'string' ? userData.rol.toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'mesero');
      const roleDef = ROLE_DEFINITIONS[roleSlug] || ROLE_DEFINITIONS.mesero;

      const normalizedUser = {
        ...userData,
        rolSlug: roleSlug,
        rol: {
          id: userData.rol?.id || `rol_${roleSlug}`,
          nombre: userData.rol?.nombre || roleDef.nombre,
          slug: roleSlug,
        },
        permisos: Array.isArray(userData.permisos) && userData.permisos.length > 0 ? userData.permisos : roleDef.permisos,
        esSuperAdmin: roleSlug === 'super_admin' || Boolean(userData.esSuperAdmin),
      };

      this.currentUser = normalizedUser;
      sessionStorage.setItem('nf_user', JSON.stringify(normalizedUser));

      // Asignar módulo y vista inicial según la política RBAC del perfil
      this.currentModule = roleDef.defaultModule || 'gestion';
      this.currentView = roleDef.defaultView || 'dashboard';
      sessionStorage.setItem('nf_module', this.currentModule);
      sessionStorage.setItem('nf_view', this.currentView);
    } else {
      this.currentUser = null;
      sessionStorage.removeItem('nf_user');
      sessionStorage.removeItem('nf_view');
      this.currentView = 'login';
    }

    this.notify('user_changed', this.currentUser);
  }

  setView(viewName) {
    if (viewName !== 'login') {
      if (!this.canAccessView(viewName)) {
        console.warn(`[RBAC] Acceso denegado a la vista "${viewName}" para el rol "${this.getRoleSlug()}".`);
        // Redirigir a la vista de acceso restringido o a su vista por defecto
        this.currentView = 'acceso_denegado';
        this.attemptedView = viewName;
        sessionStorage.setItem('nf_view', 'acceso_denegado');
        this.notify('view_changed', 'acceso_denegado');
        return;
      }
    }

    this.currentView = viewName;
    sessionStorage.setItem('nf_view', viewName);
    this.notify('view_changed', viewName);
  }

  setModule(moduleName) {
    // Si el perfil no tiene permiso para cambiar de módulo, forzar su módulo permitido
    if (!this.canSwitchModule()) {
      const roleDef = this.getRoleDefinition();
      this.currentModule = roleDef?.defaultModule || 'pos';
    } else {
      this.currentModule = moduleName;
    }
    sessionStorage.setItem('nf_module', this.currentModule);
    this.notify('module_changed', this.currentModule);
  }

  addToCart(product) {
    const existing = this.cartItems.find((i) => i.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cartItems.push({
        id: product.id,
        nombre: product.nombre,
        precio: Number(product.precio_base || product.precio || 0),
        tipoImpuesto: product.tipo_impuesto || 'IVA_19',
        quantity: 1,
      });
    }
    this.notify('cart_updated', this.cartItems);
  }

  updateCartQuantity(productId, delta) {
    const item = this.cartItems.find((i) => i.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cartItems = this.cartItems.filter((i) => i.id !== productId);
    }
    this.notify('cart_updated', this.cartItems);
  }

  clearCart() {
    this.cartItems = [];
    this.notify('cart_updated', this.cartItems);
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('nf_user');
    sessionStorage.removeItem('nf_view');
    this.clearCart();
    this.setView('login');
  }
}

export const state = new AppState();
