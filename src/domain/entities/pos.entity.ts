import { TipoImpuesto } from './catalogo.entity.js';

export type ModoAtencion = 'MOSTRADOR_ESCANER' | 'MESA_SERVICIO' | 'VITRINA_RAPIDO';
export type EstadoComanda = 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'ENTREGADO' | 'COBRADO' | 'CANCELADO';
export type EstadoPreparacionItem = 'PENDIENTE' | 'EN_COCINA' | 'LISTO';

export interface ItemComandaProps {
  id: string;
  comandaId: string;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  tipoImpuesto: TipoImpuesto;
  notasCocina?: string;
  requiereKds?: boolean;
  estadoPreparacion?: EstadoPreparacionItem;
}

export class ItemComanda {
  public readonly id: string;
  public readonly comandaId: string;
  public readonly productoId: string;
  public readonly nombreProducto: string;
  public cantidad: number;
  public readonly precioUnitario: number;
  public readonly tipoImpuesto: TipoImpuesto;
  public readonly notasCocina?: string;
  public readonly requiereKds: boolean;
  public estadoPreparacion: EstadoPreparacionItem;

  constructor(props: ItemComandaProps) {
    this.id = props.id;
    this.comandaId = props.comandaId;
    this.productoId = props.productoId;
    this.nombreProducto = props.nombreProducto;
    this.cantidad = props.cantidad;
    this.precioUnitario = props.precioUnitario;
    this.tipoImpuesto = props.tipoImpuesto;
    this.notasCocina = props.notasCocina;
    this.requiereKds = props.requiereKds ?? false;
    this.estadoPreparacion = props.estadoPreparacion ?? 'PENDIENTE';
  }

  public get subtotal(): number {
    return this.precioUnitario * this.cantidad;
  }

  public calcularImpuesto(): { tipo: TipoImpuesto; monto: number } {
    const sub = this.subtotal;
    switch (this.tipoImpuesto) {
      case 'IVA_19':
        return { tipo: 'IVA_19', monto: Math.round(sub * 0.19) };
      case 'IVA_5':
        return { tipo: 'IVA_5', monto: Math.round(sub * 0.05) };
      case 'IMPOCONSUMO_8':
        return { tipo: 'IMPOCONSUMO_8', monto: Math.round(sub * 0.08) };
      case 'EXENTO':
      default:
        return { tipo: 'EXENTO', monto: 0 };
    }
  }
}

export interface ComandaProps {
  id: string;
  numeroComanda: string;
  modoAtencion: ModoAtencion;
  puntoAtencionId?: string; // Null para venta rápida de mostrador
  puntoAtencionNombre?: string;
  estado?: EstadoComanda;
  clienteNombre?: string;
  clienteNit?: string;
  descuento?: number;
  incluyePropina?: boolean;
  porcentajePropina?: number; // e.g. 10%
  notas?: string;
  items?: ItemComanda[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Comanda {
  public readonly id: string;
  public readonly numeroComanda: string;
  public readonly modoAtencion: ModoAtencion;
  public readonly puntoAtencionId?: string;
  public readonly puntoAtencionNombre?: string;
  public estado: EstadoComanda;
  public clienteNombre: string;
  public clienteNit: string;
  public descuento: number;
  public incluyePropina: boolean;
  public porcentajePropina: number;
  public notas?: string;
  public items: ItemComanda[];
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: ComandaProps) {
    this.id = props.id;
    this.numeroComanda = props.numeroComanda;
    this.modoAtencion = props.modoAtencion;
    this.puntoAtencionId = props.puntoAtencionId;
    this.puntoAtencionNombre = props.puntoAtencionNombre;
    this.estado = props.estado ?? 'PENDIENTE';
    this.clienteNombre = props.clienteNombre ?? 'Consumidor Final';
    this.clienteNit = props.clienteNit ?? '222222222222';
    this.descuento = props.descuento ?? 0;
    this.incluyePropina = props.incluyePropina ?? false;
    this.porcentajePropina = props.porcentajePropina ?? 10;
    this.notas = props.notas;
    this.items = props.items ?? [];
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  public agregarItem(item: ItemComanda): void {
    const existing = this.items.find(
      (i) => i.productoId === item.productoId && i.notasCocina === item.notasCocina
    );
    if (existing) {
      existing.cantidad += item.cantidad;
    } else {
      this.items.push(item);
    }
    this.updatedAt = new Date();
  }

  public get subtotal(): number {
    return this.items.reduce((acc, item) => acc + item.subtotal, 0);
  }

  public get baseGravable(): number {
    return Math.max(0, this.subtotal - this.descuento);
  }

  public get totalImpuestos(): { iva19: number; iva5: number; impoconsumo8: number; total: number } {
    let iva19 = 0;
    let iva5 = 0;
    let impoconsumo8 = 0;

    for (const item of this.items) {
      const imp = item.calcularImpuesto();
      if (imp.tipo === 'IVA_19') iva19 += imp.monto;
      else if (imp.tipo === 'IVA_5') iva5 += imp.monto;
      else if (imp.tipo === 'IMPOCONSUMO_8') impoconsumo8 += imp.monto;
    }

    return {
      iva19,
      iva5,
      impoconsumo8,
      total: iva19 + iva5 + impoconsumo8,
    };
  }

  public get propinaSugerida(): number {
    if (!this.incluyePropina) return 0;
    return Math.round(this.baseGravable * (this.porcentajePropina / 100));
  }

  public get total(): number {
    const impuestos = this.totalImpuestos;
    return this.baseGravable + impuestos.total + this.propinaSugerida;
  }

  public get itemsRequierenKds(): ItemComanda[] {
    return this.items.filter((item) => item.requiereKds);
  }
}
