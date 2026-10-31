import { UnidadMedida } from './tipos-comunes.js';

export interface ProductoVarianteProps {
  id: string;
  productoId: string;
  nombre: string;
  sku?: string;
  codigoBarras?: string;
  unidadMedida?: UnidadMedida;
  factorConversion?: number;
  precioBase: number;
  costo?: number;
  activo?: boolean;
  createdAt?: Date;
}

export class ProductoVariante {
  public readonly id: string;
  public readonly productoId: string;
  public readonly nombre: string;
  public readonly sku?: string;
  public readonly codigoBarras?: string;
  public readonly unidadMedida: UnidadMedida;
  public readonly factorConversion: number;
  public readonly precioBase: number;
  public readonly costo: number;
  public readonly activo: boolean;
  public readonly createdAt: Date;

  constructor(props: ProductoVarianteProps) {
    this.id = props.id;
    this.productoId = props.productoId;
    this.nombre = props.nombre;
    this.sku = props.sku;
    this.codigoBarras = props.codigoBarras;
    this.unidadMedida = props.unidadMedida ?? 'UNIDAD';
    this.factorConversion = Number(props.factorConversion ?? 1);
    this.precioBase = Number(props.precioBase || 0);
    this.costo = Number(props.costo ?? 0);
    this.activo = props.activo ?? true;
    this.createdAt = props.createdAt ?? new Date();
  }
}
