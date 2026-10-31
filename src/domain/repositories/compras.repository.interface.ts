import {
  OrdenCompra,
  OrdenCompraProps,
  RecepcionCompra,
  CuentaPorPagar,
  CuentaPorPagarProps,
} from '../entities/compras.entity.js';

export interface IComprasRepository {
  // Órdenes de Compra
  createOrden(schemaName: string, orden: OrdenCompra): Promise<OrdenCompra>;
  updateOrden(schemaName: string, id: string, data: Partial<OrdenCompraProps>): Promise<OrdenCompra>;
  getOrdenById(schemaName: string, id: string): Promise<OrdenCompra | null>;
  listOrdenes(
    schemaName: string,
    filters?: {
      estado?: string;
      proveedorId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ ordenes: OrdenCompra[]; total: number; page: number; totalPages: number }>;
  getNextNumeroOrden(schemaName: string): Promise<string>;

  // Recepción de Mercancía
  createRecepcion(schemaName: string, rec: RecepcionCompra): Promise<RecepcionCompra>;
  getRecepcionById(schemaName: string, id: string): Promise<RecepcionCompra | null>;
  listRecepcionesByOrden(schemaName: string, ordenId: string): Promise<RecepcionCompra[]>;
  getNextNumeroRecepcion(schemaName: string): Promise<string>;

  // Cuentas por Pagar (Proveedores)
  createCuentaPorPagar(schemaName: string, cuenta: CuentaPorPagar): Promise<CuentaPorPagar>;
  updateCuentaPorPagar(schemaName: string, id: string, data: Partial<CuentaPorPagarProps>): Promise<CuentaPorPagar>;
  getCuentaById(schemaName: string, id: string): Promise<CuentaPorPagar | null>;
  listCuentasPorPagar(
    schemaName: string,
    filters?: {
      estado?: string;
      proveedorId?: string;
      vencidas?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ cuentas: CuentaPorPagar[]; total: number; page: number; totalPages: number }>;
  registrarPagoCuenta(schemaName: string, cuentaId: string, monto: number, referencia?: string): Promise<void>;
}

