/**
 * CLIENTE API UNIFICADO — NÚCLEO FINANCIERO
 * Inyecta automáticamente los encabezados multi-tenant y procesa respuestas JSON.
 * Optimizado para conexiones inestables con retry automático y timeouts.
 */

import { state } from './state.js';

const API_BASE = '/api/v1';
const DEFAULT_TIMEOUT = 15000; // 15s timeout para conexiones lentas
const MAX_RETRIES = 2;

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

  static async request(endpoint, options = {}, retries = MAX_RETRIES) {
    const url = `${API_BASE}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const config = {
      ...options,
      signal: controller.signal,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error del servidor HTTP ${response.status}`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeout);

      // Retry on network errors (not on HTTP 4xx/5xx business errors)
      if (retries > 0 && (err.name === 'AbortError' || err.name === 'TypeError')) {
        console.warn(`[API Retry] ${endpoint} — intento ${MAX_RETRIES - retries + 1}`);
        await new Promise(r => setTimeout(r, 1000));
        return this.request(endpoint, options, retries - 1);
      }

      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // ─── Autenticación ───────────────────────────────────────
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

  // ─── Empresas y Roles ────────────────────────────────────
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

  // ─── Facturación Electrónica DIAN ────────────────────────
  static async listFacturas(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/facturacion/documentos${query ? `?${query}` : ''}`);
  }

  static async getFacturaById(id) {
    return this.request(`/facturacion/documentos/${id}`);
  }

  static async emitirFacturaDirecta(facturaData) {
    return this.request('/facturacion/documentos', {
      method: 'POST',
      body: JSON.stringify(facturaData),
    });
  }

  static async anularFactura(id, motivo = '') {
    return this.request(`/facturacion/documentos/${id}/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  }

  static async registrarPago(facturaId, pagoData) {
    return this.request(`/facturacion/documentos/${facturaId}/pago`, {
      method: 'POST',
      body: JSON.stringify(pagoData),
    });
  }

  static async getResumenFinanciero() {
    return this.request('/facturacion/resumen');
  }

  // ─── Terceros (Clientes y Proveedores) ─────────────────
  static async listTerceros(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/terceros${query ? `?${query}` : ''}`);
  }

  static async createTercero(terceroData) {
    return this.request('/terceros', {
      method: 'POST',
      body: JSON.stringify(terceroData),
    });
  }

  // ─── Contabilidad y Asientos Contables ─────────────────
  static async getLibroDiario() {
    return this.request('/contabilidad/libro-diario');
  }

  static async createAsiento(asientoData) {
    return this.request('/contabilidad/asientos', {
      method: 'POST',
      body: JSON.stringify(asientoData),
    });
  }

  static async getPuc() {
    return this.request('/contabilidad/puc');
  }

  static async getBalancePrueba() {
    return this.request('/contabilidad/balance-prueba');
  }

  static async getLiquidacionImpuestos() {
    return this.request('/contabilidad/liquidacion-impuestos');
  }

  // ─── Punto de Venta (POS) ────────────────────────────────
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
