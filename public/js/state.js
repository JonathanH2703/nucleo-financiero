/**
 * GESTOR DE ESTADO REACTIVO (STORE) — NÚCLEO FINANCIERO
 */

import { DEMO_TENANTS } from './demo-fixtures.js';

class AppState {
  constructor() {
    // Cargar estado inicial desde sessionStorage si existe
    const savedTenantSlug = sessionStorage.getItem('nf_tenant_slug') || 'restaurante_origen';
    const savedUserJson = sessionStorage.getItem('nf_user');
    const savedModule = sessionStorage.getItem('nf_module') || 'gestion'; // 'gestion' | 'pos'
    const savedView = sessionStorage.getItem('nf_view') || 'login';

    this.currentTenant = DEMO_TENANTS.find((t) => t.slug === savedTenantSlug) || DEMO_TENANTS[0];
    this.currentUser = savedUserJson ? JSON.parse(savedUserJson) : null;
    this.currentModule = savedModule;
    this.currentView = this.currentUser ? (savedView === 'login' ? 'dashboard' : savedView) : 'login';

    // Carrito de ventas POS
    this.cartItems = [];
    this.selectedTable = 'Mesa 02';

    // Lista de oyentes para reactividad
    this.listeners = [];
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
    this.currentUser = userData;
    if (userData) {
      sessionStorage.setItem('nf_user', JSON.stringify(userData));
    } else {
      sessionStorage.removeItem('nf_user');
    }
    this.notify('user_changed', userData);
  }

  setView(viewName) {
    this.currentView = viewName;
    sessionStorage.setItem('nf_view', viewName);
    this.notify('view_changed', viewName);
  }

  setModule(moduleName) {
    this.currentModule = moduleName;
    sessionStorage.setItem('nf_module', moduleName);
    this.notify('module_changed', moduleName);
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
    this.clearCart();
    this.setView('login');
  }
}

export const state = new AppState();
