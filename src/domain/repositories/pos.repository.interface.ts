import { Categoria, Producto } from '../entities/catalogo.entity.js';
import { AreaOperativa, PuntoAtencion, EstadoPuntoAtencion } from '../entities/operacion.entity.js';
import { Comanda, ItemComanda, EstadoComanda, EstadoPreparacionItem } from '../entities/pos.entity.js';
import { FacturaFiscal } from '../entities/facturacion.entity.js';

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
  getFacturaById(schemaName: string, id: string): Promise<FacturaFiscal | null>;
  getNextConsecutivo(schemaName: string, prefijo: string): Promise<number>;
}
