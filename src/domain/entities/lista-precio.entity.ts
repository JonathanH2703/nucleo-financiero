export interface ListaPrecioProps {
  id: string;
  nombre: string;
  descripcion?: string;
  moneda?: string;
  activa?: boolean;
  createdAt?: Date;
}

export class ListaPrecio {
  public readonly id: string;
  public readonly nombre: string;
  public readonly descripcion?: string;
  public readonly moneda: string;
  public readonly activa: boolean;
  public readonly createdAt: Date;

  constructor(props: ListaPrecioProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.descripcion = props.descripcion;
    this.moneda = props.moneda || 'COP';
    this.activa = props.activa ?? true;
    this.createdAt = props.createdAt ?? new Date();
  }
}

export interface PrecioProductoProps {
  id: string;
  listaPrecioId: string;
  productoId: string;
  varianteId?: string;
  precio: number;
  descuentoMaximo?: number;
}

export class PrecioProducto {
  public readonly id: string;
  public readonly listaPrecioId: string;
  public readonly productoId: string;
  public readonly varianteId?: string;
  public readonly precio: number;
  public readonly descuentoMaximo: number;

  constructor(props: PrecioProductoProps) {
    this.id = props.id;
    this.listaPrecioId = props.listaPrecioId;
    this.productoId = props.productoId;
    this.varianteId = props.varianteId;
    this.precio = Number(props.precio || 0);
    this.descuentoMaximo = Number(props.descuentoMaximo ?? 0);
  }
}
