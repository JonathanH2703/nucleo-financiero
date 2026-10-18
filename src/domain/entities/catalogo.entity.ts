export type TipoImpuesto = 'IVA_19' | 'IVA_5' | 'IMPOCONSUMO_8' | 'EXENTO';
export type UnidadMedida = 'UNIDAD' | 'KG_GRAMOS' | 'PORCION';

export interface CategoriaProps {
  id: string;
  nombre: string;
  icono?: string;
  color?: string;
  orden?: number;
  activo?: boolean;
}

export class Categoria {
  public readonly id: string;
  public readonly nombre: string;
  public readonly icono: string;
  public readonly color: string;
  public readonly orden: number;
  public readonly activo: boolean;

  constructor(props: CategoriaProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.icono = props.icono ?? 'tag';
    this.color = props.color ?? '#2563eb';
    this.orden = props.orden ?? 0;
    this.activo = props.activo ?? true;
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
  requiereKds?: boolean; // True para cocinas/bares/preparación; False para venta directa mostrador/panadería
  stockActual?: number;
  stockMinimo?: number;
  activo?: boolean;
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

  constructor(props: ProductoProps) {
    this.id = props.id;
    this.categoriaId = props.categoriaId;
    this.nombre = props.nombre;
    this.descripcion = props.descripcion;
    this.sku = props.sku;
    this.codigoBarras = props.codigoBarras;
    this.precioBase = props.precioBase;
    this.costo = props.costo ?? 0;
    this.tipoImpuesto = props.tipoImpuesto ?? 'IVA_19';
    this.unidadMedida = props.unidadMedida ?? 'UNIDAD';
    this.requiereKds = props.requiereKds ?? false;
    this.stockActual = props.stockActual ?? 0;
    this.stockMinimo = props.stockMinimo ?? 5;
    this.activo = props.activo ?? true;
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
