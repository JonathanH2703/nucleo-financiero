/**
 * CLIENTE API UNIFICADO — NÚCLEO FINANCIERO
 * Inyecta automáticamente los encabezados multi-tenant y procesa respuestas JSON.
 */

import { state } from './state.js';

const API_BASE = '/api/v1';

export class ApiClient {
  static getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (state.currentTenant && state.currentTenant.slug) {
      headers['x-tenant-slug'] = state.currentTenant.slug;
    }

    return headers;
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error del servidor HTTP ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // Métodos de Autenticación
  static async loginPin(pin) {
    return this.request('/auth/login-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  static async loginEmail(email, password) {
    return this.request('/auth/login-email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Métodos de Empresas y Roles
  static async listTenants() {
    return this.request('/tenants');
  }

  static async listRoles() {
    return this.request('/auth/roles');
  }

  static async listPermisos() {
    return this.request('/auth/permisos');
  }

  static async listUsuarios() {
    return this.request('/auth/usuarios');
  }

  // Módulo de Facturación Electrónica DIAN
  static async listFacturas(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/facturacion/documentos${query ? `?${query}` : ''}`);
  }

  // Módulo de Punto de Venta (POS)
  static async getCatalogoPos(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/pos/catalogo${query ? `?${query}` : ''}`);
  }

  static async getOperacionPos() {
    return this.request('/pos/operacion');
  }

  static async getComandasActivas() {
    return this.request('/pos/comandas');
  }

  static async cobrarComanda(comandaId, pagoData) {
    return this.request(`/pos/comandas/${comandaId}/cobrar`, {
      method: 'POST',
      body: JSON.stringify(pagoData),
    });
  }
}
