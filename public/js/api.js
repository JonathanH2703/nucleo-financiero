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

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`El servidor respondió con un error (HTTP ${response.status}). Intente nuevamente.`);
      }

      const data = await response.json();

      if (!response.ok) {
        const msg = data?.error?.message || data?.message || `Error del servidor HTTP ${response.status}`;
        throw new Error(msg);
      }

      return data;
    } catch (err) {
      clearTimeout(timeout);

      // Retry on network/timeout errors only (not on HTTP business errors)
      if (retries > 0 && (err.name === 'AbortError' || err.name === 'TypeError')) {
        console.warn(`[API Retry] ${endpoint} — intento ${MAX_RETRIES - retries + 1}`);
        await new Promise(r => setTimeout(r, 1000));
        return this.request(endpoint, options, retries - 1);
      }

      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // ─── Autenticación Unificada (NIT + PIN) ────────────────
  static async loginNitPin(nit, pin) {
    return this.request('/auth/login-nit-pin', {
      method: 'POST',
      body: JSON.stringify({ nit, pin }),
    });
  }

  static async loginAdminSistema(pin) {
    return this.request('/auth/login-admin-sistema', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

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

  // ─── Gestión de Empresas y Sucursales ────────────────────
  static async listTenants() {
    return this.request('/tenants');
  }

  static async getTenantDetalle(id) {
    return this.request(`/tenants/${id}/detalle`);
  }

  static async createTenant(tenantData) {
    return this.request('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  }

  static async updateTenant(id, tenantData) {
    return this.request(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData),
    });
  }

  static async updateTenantPlan(id, { plan, modulosActivos }) {
    return this.request(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ plan, modulosActivos }),
    });
  }

  static async listSucursales() {
    return this.request('/sucursales');
  }

  static async createSucursal(sucursalData) {
    return this.request('/sucursales', {
      method: 'POST',
      body: JSON.stringify(sucursalData),
    });
  }

  static async updateSucursal(id, sucursalData) {
    return this.request(`/sucursales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sucursalData),
    });
  }

  static async deleteSucursal(id) {
    return this.request(`/sucursales/${id}`, {
      method: 'DELETE',
    });
  }

  static async createUsuario(usuarioData) {
    return this.request('/auth/usuarios', {
      method: 'POST',
      body: JSON.stringify(usuarioData),
    });
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

  static async createComanda(comandaData) {
    return this.request('/pos/comandas', {
      method: 'POST',
      body: JSON.stringify(comandaData),
    });
  }

  static async cobrarComanda(comandaId, pagoData) {
    return this.request(`/pos/comandas/${comandaId}/cobrar`, {
      method: 'POST',
      body: JSON.stringify(pagoData),
    });
  }

  // ─── Catálogo y Productos ─────────────────────────────────
  static async listProductos(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/catalogo/productos${query ? `?${query}` : ''}`);
  }

  static async getProducto(id) {
    return this.request(`/catalogo/productos/${id}`);
  }

  static async createProducto(prodData) {
    return this.request('/catalogo/productos', {
      method: 'POST',
      body: JSON.stringify(prodData),
    });
  }

  static async updateProducto(id, prodData) {
    return this.request(`/catalogo/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(prodData),
    });
  }

  static async deleteProducto(id) {
    return this.request(`/catalogo/productos/${id}`, {
      method: 'DELETE',
    });
  }

  static async listCategorias() {
    return this.request('/catalogo/categorias');
  }

  static async createCategoria(catData) {
    return this.request('/catalogo/categorias', {
      method: 'POST',
      body: JSON.stringify(catData),
    });
  }

  static async listVariantes(productoId) {
    return this.request(`/catalogo/productos/${productoId}/variantes`);
  }

  static async createVariante(productoId, varData) {
    return this.request(`/catalogo/productos/${productoId}/variantes`, {
      method: 'POST',
      body: JSON.stringify(varData),
    });
  }

  static async setPrecioProducto(precioData) {
    return this.request('/catalogo/precios', {
      method: 'POST',
      body: JSON.stringify(precioData),
    });
  }

  // ─── Inventario, Kardex y Stock ───────────────────────────
  static async getKardex(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/inventario/kardex${query ? `?${query}` : ''}`);
  }

  static async registrarMovimientoInventario(movData) {
    return this.request('/inventario/movimientos', {
      method: 'POST',
      body: JSON.stringify(movData),
    });
  }

  static async getStockProducto(productoId) {
    return this.request(`/inventario/stock/${productoId}`);
  }

  static async getStockBajo() {
    return this.request('/inventario/stock-bajo');
  }

  static async listAjustesInventario() {
    return this.request('/inventario/ajustes');
  }

  static async createAjusteInventario(ajusteData) {
    return this.request('/inventario/ajustes', {
      method: 'POST',
      body: JSON.stringify(ajusteData),
    });
  }

  static async confirmarAjusteInventario(id) {
    return this.request(`/inventario/ajustes/${id}/confirmar`, {
      method: 'PUT',
    });
  }

  static async revertirAjusteInventario(id) {
    return this.request(`/inventario/ajustes/${id}/revertir`, {
      method: 'PUT',
    });
  }

  static async listLotesInventario() {
    return this.request('/inventario/lotes');
  }

  // ─── Bodegas de Sucursal ─────────────────────────────────
  static async listBodegas() {
    return this.request('/sucursales/bodegas');
  }

  static async createBodega(bodegaData) {
    return this.request('/sucursales/bodegas', {
      method: 'POST',
      body: JSON.stringify(bodegaData),
    });
  }
}
