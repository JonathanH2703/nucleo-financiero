import { Categoria, Producto } from '../entities/catalogo.entity.js';
import { AreaOperativa, PuntoAtencion, EstadoPuntoAtencion } from '../entities/operacion.entity.js';
import { Comanda, ItemComanda, EstadoComanda, EstadoPreparacionItem } from '../entities/pos.entity.js';
import { FacturaFiscal, EstadoDian } from '../entities/facturacion.entity.js';

export interface ICatalogoRepository {
  listCategorias(schemaName: string): Promise<Categoria[]>;
  listProductos(schemaName: string, categoriaId?: string, search?: string): Promise<Producto[]>;
  getProductoById(schemaName: string, id: string): Promise<Producto | null>;
  getProductoByBarcode(schemaName: string, barcode: string): Promise<Producto | null>;
  createProducto(schemaName: string, producto: Producto): Promise<Producto>;
}

export interface IOperacionRepository {
  listAreas(schemaName: string): Promise<AreaOperativa[]>;
  listPuntosAtencion(schemaName: string, areaId?: string): Promise<PuntoAtencion[]>;
  getPuntoAtencionById(schemaName: string, id: string): Promise<PuntoAtencion | null>;
  updateEstadoPunto(schemaName: string, id: string, estado: EstadoPuntoAtencion): Promise<void>;
}

export interface IPosRepository {
  createComanda(schemaName: string, comanda: Comanda): Promise<Comanda>;
  getComandaById(schemaName: string, id: string): Promise<Comanda | null>;
  listComandasActivas(schemaName: string): Promise<Comanda[]>;
  listKdsItems(schemaName: string): Promise<{ item: ItemComanda; comandaNumero: string; puntoAtencion?: string }[]>;
  updateComandaEstado(schemaName: string, id: string, estado: EstadoComanda): Promise<void>;
  updateItemKdsEstado(schemaName: string, itemId: string, estado: EstadoPreparacionItem): Promise<void>;
}

export interface IFacturacionRepository {
  createFactura(schemaName: string, factura: FacturaFiscal): Promise<FacturaFiscal>;
  listFacturas(schemaName: string, limit?: number): Promise<FacturaFiscal[]>;
  listFacturasWithFilters(
    schemaName: string,
    filters: {
      estado?: string;
      search?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      tipoDocumento?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ facturas: FacturaFiscal[]; total: number; page: number; totalPages: number }>;
  getFacturaById(schemaName: string, id: string): Promise<FacturaFiscal | null>;
  getNextConsecutivo(schemaName: string, prefijo: string): Promise<number>;
  updateFacturaEstado(schemaName: string, id: string, estado: EstadoDian): Promise<void>;
  createPagoFactura(
    schemaName: string,
    pago: { id: string; facturaId: string; monto: number; metodoPago: string; referencia?: string; notas?: string }
  ): Promise<void>;
  listPagosFactura(schemaName: string, facturaId: string): Promise<any[]>;
  getResumenFinanciero(schemaName: string): Promise<{
    totalFacturado: number;
    totalCobrado: number;
    totalPendiente: number;
    totalVencido: number;
    totalAnulado: number;
    facturasEsteMes: number;
    ingresoEsteMes: number;
    cuentasPorCobrar: number;
  }>;
}

