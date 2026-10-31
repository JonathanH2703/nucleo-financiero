export interface SucursalProps {
  id: string;
  nombre: string;
  codigo: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  telefono?: string;
  responsableId?: string;
  activa?: boolean;
  createdAt?: Date;
}

export class Sucursal {
  public readonly id: string;
  public readonly nombre: string;
  public readonly codigo: string;
  public readonly direccion?: string;
  public readonly ciudad?: string;
  public readonly departamento?: string;
  public readonly telefono?: string;
  public readonly responsableId?: string;
  public readonly activa: boolean;
  public readonly createdAt: Date;

  constructor(props: SucursalProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.codigo = props.codigo;
    this.direccion = props.direccion;
    this.ciudad = props.ciudad || 'Bogotá D.C.';
    this.departamento = props.departamento;
    this.telefono = props.telefono;
    this.responsableId = props.responsableId;
    this.activa = props.activa ?? true;
    this.createdAt = props.createdAt ?? new Date();
  }
}
