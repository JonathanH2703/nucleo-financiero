import { TipoMovimientoInventario, EstadoAjusteInventario, TipoAjuste } from './tipos-comunes.js';

export interface MovimientoInventarioProps {
  id: string;
  productoId: string;
  varianteId?: string;
  bodegaId: string;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  costoUnitario?: number;
  saldoAnterior: number;
  saldoNuevo: number;
  loteId?: string;
  referenciaDocumento?: string;
  referenciaTipo?: string;
  notas?: string;
  creadoPor?: string;
  fecha?: Date;
}

export class MovimientoInventario {
  public readonly id: string;
  public readonly productoId: string;
  public readonly varianteId?: string;
  public readonly bodegaId: string;
  public readonly tipo: TipoMovimientoInventario;
  public readonly cantidad: number;
  public readonly costoUnitario: number;
  public readonly saldoAnterior: number;
  public readonly saldoNuevo: number;
  public readonly loteId?: string;
  public readonly referenciaDocumento?: string;
  public readonly referenciaTipo?: string;
  public readonly notas?: string;
  public readonly creadoPor?: string;
  public readonly fecha: Date;

  constructor(props: MovimientoInventarioProps) {
    this.id = props.id;
    this.productoId = props.productoId;
    this.varianteId = props.varianteId;
    this.bodegaId = props.bodegaId;
    this.tipo = props.tipo;
    this.cantidad = Number(props.cantidad || 0);
    this.costoUnitario = Number(props.costoUnitario ?? 0);
    this.saldoAnterior = Number(props.saldoAnterior || 0);
    this.saldoNuevo = Number(props.saldoNuevo || 0);
    this.loteId = props.loteId;
    this.referenciaDocumento = props.referenciaDocumento;
    this.referenciaTipo = props.referenciaTipo;
    this.notas = props.notas;
    this.creadoPor = props.creadoPor;
    this.fecha = props.fecha ?? new Date();
  }
}

export interface LoteInventarioProps {
  id: string;
  productoId: string;
  varianteId?: string;
  bodegaId: string;
  numeroLote: string;
  fechaVencimiento?: Date;
  fechaIngreso?: Date;
  cantidadInicial: number;
  cantidadDisponible: number;
  costoUnitario?: number;
  activo?: boolean;
}

export class LoteInventario {
  public readonly id: string;
  public readonly productoId: string;
  public readonly varianteId?: string;
  public readonly bodegaId: string;
  public readonly numeroLote: string;
  public readonly fechaVencimiento?: Date;
  public readonly fechaIngreso: Date;
  public readonly cantidadInicial: number;
  public readonly cantidadDisponible: number;
  public readonly costoUnitario: number;
  public readonly activo: boolean;

  constructor(props: LoteInventarioProps) {
    this.id = props.id;
    this.productoId = props.productoId;
    this.varianteId = props.varianteId;
    this.bodegaId = props.bodegaId;
    this.numeroLote = props.numeroLote;
    this.fechaVencimiento = props.fechaVencimiento;
    this.fechaIngreso = props.fechaIngreso ?? new Date();
    this.cantidadInicial = Number(props.cantidadInicial || 0);
    this.cantidadDisponible = Number(props.cantidadDisponible || 0);
    this.costoUnitario = Number(props.costoUnitario ?? 0);
    this.activo = props.activo ?? true;
  }
}

export interface AjusteItemProps {
  id: string;
  ajusteId: string;
  productoId: string;
  varianteId?: string;
  cantidadSistema: number;
  cantidadFisica: number;
  diferencia: number;
  costoUnitario?: number;
}

export class AjusteItem {
  public readonly id: string;
  public readonly ajusteId: string;
  public readonly productoId: string;
  public readonly varianteId?: string;
  public readonly cantidadSistema: number;
  public readonly cantidadFisica: number;
  public readonly diferencia: number;
  public readonly costoUnitario: number;

  constructor(props: AjusteItemProps) {
    this.id = props.id;
    this.ajusteId = props.ajusteId;
    this.productoId = props.productoId;
    this.varianteId = props.varianteId;
    this.cantidadSistema = Number(props.cantidadSistema || 0);
    this.cantidadFisica = Number(props.cantidadFisica || 0);
    this.diferencia = Number(props.diferencia || 0);
    this.costoUnitario = Number(props.costoUnitario ?? 0);
  }
}

export interface AjusteInventarioProps {
  id: string;
  bodegaId: string;
  numero: string;
  tipo?: TipoAjuste;
  observaciones?: string;
  estado?: EstadoAjusteInventario;
  creadoPor?: string;
  aprobadoPor?: string;
  items?: AjusteItem[];
  createdAt?: Date;
}

export class AjusteInventario {
  public readonly id: string;
  public readonly bodegaId: string;
  public readonly numero: string;
  public readonly tipo: TipoAjuste;
  public readonly observaciones?: string;
  public estado: EstadoAjusteInventario;
  public readonly creadoPor?: string;
  public aprobadoPor?: string;
  public items: AjusteItem[];
  public readonly createdAt: Date;

  constructor(props: AjusteInventarioProps) {
    this.id = props.id;
    this.bodegaId = props.bodegaId;
    this.numero = props.numero;
    this.tipo = props.tipo ?? 'CONTEO_FISICO';
    this.observaciones = props.observaciones;
    this.estado = props.estado ?? 'PENDIENTE';
    this.creadoPor = props.creadoPor;
    this.aprobadoPor = props.aprobadoPor;
    this.items = props.items ?? [];
    this.createdAt = props.createdAt ?? new Date();
  }
}
