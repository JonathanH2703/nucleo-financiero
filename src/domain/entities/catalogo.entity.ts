import { UnidadMedida, TipoImpuesto } from './tipos-comunes.js';

export { UnidadMedida, TipoImpuesto };

export interface CategoriaProps {
  id: string;
  nombre: string;
  icono?: string;
  color?: string;
  orden?: number;
  activo?: boolean;
  categoriaPadreId?: string;
  slug?: string;
  descripcion?: string;
}

export class Categoria {
  public readonly id: string;
  public readonly nombre: string;
  public readonly icono: string;
  public readonly color: string;
  public readonly orden: number;
  public readonly activo: boolean;
  public readonly categoriaPadreId?: string;
  public readonly slug?: string;
  public readonly descripcion?: string;

  constructor(props: CategoriaProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.icono = props.icono ?? 'tag';
    this.color = props.color ?? '#2563eb';
    this.orden = props.orden ?? 0;
    this.activo = props.activo ?? true;
    this.categoriaPadreId = props.categoriaPadreId;
    this.slug = props.slug;
    this.descripcion = props.descripcion;
  }
}

export interface ProductoProps {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion?: string;
  sku?: string;
  codigoBarras?: string;
  precioBase: number;
  costo?: number;
  tipoImpuesto?: TipoImpuesto;
  unidadMedida?: UnidadMedida;
  requiereKds?: boolean;
  stockActual?: number;
  stockMinimo?: number;
  activo?: boolean;
  // Campos extendidos para inventario, imágenes y variantes
  imagenUrl?: string;
  imagenKey?: string;
  marca?: string;
  tieneLotes?: boolean;
  tieneVencimiento?: boolean;
  unidadMedidaCompra?: UnidadMedida;
  factorConversionCompra?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Producto {
  public readonly id: string;
  public readonly categoriaId: string;
  public readonly nombre: string;
  public readonly descripcion?: string;
  public readonly sku?: string;
  public readonly codigoBarras?: string;
  public readonly precioBase: number;
  public readonly costo: number;
  public readonly tipoImpuesto: TipoImpuesto;
  public readonly unidadMedida: UnidadMedida;
  public readonly requiereKds: boolean;
  public readonly stockActual: number;
  public readonly stockMinimo: number;
  public readonly activo: boolean;
  public readonly imagenUrl?: string;
  public readonly imagenKey?: string;
  public readonly marca?: string;
  public readonly tieneLotes: boolean;
  public readonly tieneVencimiento: boolean;
  public readonly unidadMedidaCompra: UnidadMedida;
  public readonly factorConversionCompra: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: ProductoProps) {
    this.id = props.id;
    this.categoriaId = props.categoriaId;
    this.nombre = props.nombre;
    this.descripcion = props.descripcion;
    this.sku = props.sku;
    this.codigoBarras = props.codigoBarras;
    this.precioBase = Number(props.precioBase || 0);
    this.costo = Number(props.costo ?? 0);
    this.tipoImpuesto = props.tipoImpuesto ?? 'IVA_19';
    this.unidadMedida = props.unidadMedida ?? 'UNIDAD';
    this.requiereKds = props.requiereKds ?? false;
    this.stockActual = Number(props.stockActual ?? 0);
    this.stockMinimo = Number(props.stockMinimo ?? 5);
    this.activo = props.activo ?? true;
    this.imagenUrl = props.imagenUrl;
    this.imagenKey = props.imagenKey;
    this.marca = props.marca;
    this.tieneLotes = props.tieneLotes ?? false;
    this.tieneVencimiento = props.tieneVencimiento ?? false;
    this.unidadMedidaCompra = props.unidadMedidaCompra ?? this.unidadMedida;
    this.factorConversionCompra = Number(props.factorConversionCompra ?? 1);
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  /**
   * Calcula el impuesto individual del producto
   */
  public calcularImpuesto(precio: number): { tasa: number; monto: number; tipo: TipoImpuesto } {
    switch (this.tipoImpuesto) {
      case 'IVA_19':
        return { tasa: 0.19, monto: Math.round(precio * 0.19), tipo: 'IVA_19' };
      case 'IVA_5':
        return { tasa: 0.05, monto: Math.round(precio * 0.05), tipo: 'IVA_5' };
      case 'IMPOCONSUMO_8':
        return { tasa: 0.08, monto: Math.round(precio * 0.08), tipo: 'IMPOCONSUMO_8' };
      case 'EXENTO':
      default:
        return { tasa: 0.0, monto: 0, tipo: 'EXENTO' };
    }
  }
}
