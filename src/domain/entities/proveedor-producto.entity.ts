import { UnidadMedida } from './tipos-comunes.js';

export interface ProveedorProductoProps {
  id: string;
  proveedorId: string;
  productoId: string;
  precioCompra: number;
  unidadCompra?: UnidadMedida;
  tiempoEntregaDias?: number;
  esProveedorPrincipal?: boolean;
  notas?: string;
  activo?: boolean;
  updatedAt?: Date;
}

export class ProveedorProducto {
  public readonly id: string;
  public readonly proveedorId: string;
  public readonly productoId: string;
  public readonly precioCompra: number;
  public readonly unidadCompra: UnidadMedida;
  public readonly tiempoEntregaDias: number;
  public readonly esProveedorPrincipal: boolean;
  public readonly notas?: string;
  public readonly activo: boolean;
  public readonly updatedAt: Date;

  constructor(props: ProveedorProductoProps) {
    this.id = props.id;
    this.proveedorId = props.proveedorId;
    this.productoId = props.productoId;
    this.precioCompra = Number(props.precioCompra || 0);
    this.unidadCompra = props.unidadCompra ?? 'UNIDAD';
    this.tiempoEntregaDias = Number(props.tiempoEntregaDias ?? 0);
    this.esProveedorPrincipal = props.esProveedorPrincipal ?? false;
    this.notas = props.notas;
    this.activo = props.activo ?? true;
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
