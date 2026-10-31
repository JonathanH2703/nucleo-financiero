import { EstadoOrdenCompra, EstadoCuentaPorPagar } from './tipos-comunes.js';

export interface OrdenCompraItemProps {
  id: string;
  ordenId: string;
  productoId: string;
  varianteId?: string;
  productoNombre: string;
  cantidadSolicitada: number;
  cantidadRecibida?: number;
  precioUnitario: number;
  subtotal?: number;
}

export class OrdenCompraItem {
  public readonly id: string;
  public readonly ordenId: string;
  public readonly productoId: string;
  public readonly varianteId?: string;
  public readonly productoNombre: string;
  public readonly cantidadSolicitada: number;
  public cantidadRecibida: number;
  public readonly precioUnitario: number;
  public readonly subtotal: number;

  constructor(props: OrdenCompraItemProps) {
    this.id = props.id;
    this.ordenId = props.ordenId;
    this.productoId = props.productoId;
    this.varianteId = props.varianteId;
    this.productoNombre = props.productoNombre;
    this.cantidadSolicitada = Number(props.cantidadSolicitada || 0);
    this.cantidadRecibida = Number(props.cantidadRecibida ?? 0);
    this.precioUnitario = Number(props.precioUnitario || 0);
    this.subtotal = props.subtotal !== undefined ? Number(props.subtotal) : this.cantidadSolicitada * this.precioUnitario;
  }
}

export interface OrdenCompraProps {
  id: string;
  proveedorId: string;
  proveedorNombre?: string;
  bodegaDestinoId: string;
  numero: string;
  estado?: EstadoOrdenCompra;
  fechaEmision?: Date;
  fechaEntregaEstimada?: Date;
  subtotal: number;
  impuestos?: number;
  total: number;
  notas?: string;
  creadoPor?: string;
  items?: OrdenCompraItem[];
  createdAt?: Date;
}

export class OrdenCompra {
  public readonly id: string;
  public readonly proveedorId: string;
  public readonly proveedorNombre?: string;
  public readonly bodegaDestinoId: string;
  public readonly numero: string;
  public estado: EstadoOrdenCompra;
  public readonly fechaEmision: Date;
  public readonly fechaEntregaEstimada?: Date;
  public readonly subtotal: number;
  public readonly impuestos: number;
  public readonly total: number;
  public readonly notas?: string;
  public readonly creadoPor?: string;
  public items: OrdenCompraItem[];
  public readonly createdAt: Date;

  constructor(props: OrdenCompraProps) {
    this.id = props.id;
    this.proveedorId = props.proveedorId;
    this.proveedorNombre = props.proveedorNombre;
    this.bodegaDestinoId = props.bodegaDestinoId;
    this.numero = props.numero;
    this.estado = props.estado ?? 'BORRADOR';
    this.fechaEmision = props.fechaEmision ?? new Date();
    this.fechaEntregaEstimada = props.fechaEntregaEstimada;
    this.subtotal = Number(props.subtotal || 0);
    this.impuestos = Number(props.impuestos ?? 0);
    this.total = Number(props.total || 0);
    this.notas = props.notas;
    this.creadoPor = props.creadoPor;
    this.items = props.items ?? [];
    this.createdAt = props.createdAt ?? new Date();
  }
}

export interface RecepcionItemProps {
  id: string;
  recepcionId: string;
  productoId: string;
  varianteId?: string;
  cantidadRecibida: number;
  costoUnitario: number;
  loteNumero?: string;
  fechaVencimiento?: Date;
}

export class RecepcionItem {
  public readonly id: string;
  public readonly recepcionId: string;
  public readonly productoId: string;
  public readonly varianteId?: string;
  public readonly cantidadRecibida: number;
  public readonly costoUnitario: number;
  public readonly loteNumero?: string;
  public readonly fechaVencimiento?: Date;

  constructor(props: RecepcionItemProps) {
    this.id = props.id;
    this.recepcionId = props.recepcionId;
    this.productoId = props.productoId;
    this.varianteId = props.varianteId;
    this.cantidadRecibida = Number(props.cantidadRecibida || 0);
    this.costoUnitario = Number(props.costoUnitario || 0);
    this.loteNumero = props.loteNumero;
    this.fechaVencimiento = props.fechaVencimiento;
  }
}

export interface RecepcionCompraProps {
  id: string;
  ordenCompraId?: string;
  proveedorId: string;
  bodegaId: string;
  numero: string;
  fecha?: Date;
  recibidoPor?: string;
  notas?: string;
  items?: RecepcionItem[];
  createdAt?: Date;
}

export class RecepcionCompra {
  public readonly id: string;
  public readonly ordenCompraId?: string;
  public readonly proveedorId: string;
  public readonly bodegaId: string;
  public readonly numero: string;
  public readonly fecha: Date;
  public readonly recibidoPor?: string;
  public readonly notas?: string;
  public items: RecepcionItem[];
  public readonly createdAt: Date;

  constructor(props: RecepcionCompraProps) {
    this.id = props.id;
    this.ordenCompraId = props.ordenCompraId;
    this.proveedorId = props.proveedorId;
    this.bodegaId = props.bodegaId;
    this.numero = props.numero;
    this.fecha = props.fecha ?? new Date();
    this.recibidoPor = props.recibidoPor;
    this.notas = props.notas;
    this.items = props.items ?? [];
    this.createdAt = props.createdAt ?? new Date();
  }
}

export interface CuentaPorPagarProps {
  id: string;
  proveedorId: string;
  proveedorNombre?: string;
  facturaProveedorNumero?: string;
  ordenCompraId?: string;
  recepcionId?: string;
  monto: number;
  saldo: number;
  fechaEmision?: Date;
  fechaVencimiento?: Date;
  estado?: EstadoCuentaPorPagar;
  notas?: string;
  createdAt?: Date;
}

export class CuentaPorPagar {
  public readonly id: string;
  public readonly proveedorId: string;
  public readonly proveedorNombre?: string;
  public readonly facturaProveedorNumero?: string;
  public readonly ordenCompraId?: string;
  public readonly recepcionId?: string;
  public readonly monto: number;
  public saldo: number;
  public readonly fechaEmision: Date;
  public readonly fechaVencimiento?: Date;
  public estado: EstadoCuentaPorPagar;
  public readonly notas?: string;
  public readonly createdAt: Date;

  constructor(props: CuentaPorPagarProps) {
    this.id = props.id;
    this.proveedorId = props.proveedorId;
    this.proveedorNombre = props.proveedorNombre;
    this.facturaProveedorNumero = props.facturaProveedorNumero;
    this.ordenCompraId = props.ordenCompraId;
    this.recepcionId = props.recepcionId;
    this.monto = Number(props.monto || 0);
    this.saldo = Number(props.saldo ?? props.monto ?? 0);
    this.fechaEmision = props.fechaEmision ?? new Date();
    this.fechaVencimiento = props.fechaVencimiento;
    this.estado = props.estado ?? 'PENDIENTE';
    this.notas = props.notas;
    this.createdAt = props.createdAt ?? new Date();
  }
}
