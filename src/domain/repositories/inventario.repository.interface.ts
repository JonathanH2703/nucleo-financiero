import {
  MovimientoInventario,
  LoteInventario,
  AjusteInventario,
} from '../entities/inventario.entity.js';

export interface IInventarioRepository {
  // Movimientos (Kardex)
  registrarMovimiento(schemaName: string, mov: MovimientoInventario): Promise<MovimientoInventario>;
  getKardex(
    schemaName: string,
    filters: {
      productoId?: string;
      varianteId?: string;
      bodegaId?: string;
      tipo?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ movimientos: MovimientoInventario[]; total: number; page: number; totalPages: number }>;

  // Stock
  getStockProducto(
    schemaName: string,
    productoId: string,
    bodegaId?: string
  ): Promise<{ bodegaId: string; bodegaNombre: string; varianteId?: string; cantidad: number; costoPromedio: number }[]>;
  getStockConsolidado(schemaName: string, productoId: string, varianteId?: string): Promise<number>;
  getProductosStockBajo(
    schemaName: string,
    bodegaId?: string
  ): Promise<
    {
      productoId: string;
      productoNombre: string;
      stockActual: number;
      stockMinimo: number;
      bodegaId?: string;
      bodegaNombre?: string;
    }[]
  >;
  actualizarStock(
    schemaName: string,
    params: {
      productoId: string;
      bodegaId: string;
      varianteId?: string;
      deltaCantidad: number; // positive to add, negative to subtract
      costoUnitario?: number;
    }
  ): Promise<{ stockNuevo: number; stockAnterior: number }>;

  // Ajustes de Inventario
  crearAjuste(schemaName: string, ajuste: AjusteInventario): Promise<AjusteInventario>;
  confirmarAjuste(schemaName: string, ajusteId: string, aprobadoPor: string): Promise<void>;
  revertirAjuste(schemaName: string, ajusteId: string): Promise<void>;
  getAjusteById(schemaName: string, id: string): Promise<AjusteInventario | null>;
  listAjustes(
    schemaName: string,
    filters?: {
      bodegaId?: string;
      estado?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ ajustes: AjusteInventario[]; total: number; page: number; totalPages: number }>;

  // Lotes y Vencimientos
  crearLote(schemaName: string, lote: LoteInventario): Promise<LoteInventario>;
  getLotesByProducto(schemaName: string, productoId: string, bodegaId?: string): Promise<LoteInventario[]>;
  getLotesProximosVencer(schemaName: string, diasAnticipacion: number): Promise<LoteInventario[]>;
  actualizarCantidadLote(schemaName: string, loteId: string, nuevaCantidad: number): Promise<void>;
}
