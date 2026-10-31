import { TipoBodega } from './tipos-comunes.js';

export interface BodegaProps {
  id: string;
  sucursalId: string;
  nombre: string;
  codigo: string;
  tipo?: TipoBodega;
  activa?: boolean;
  createdAt?: Date;
}

export class Bodega {
  public readonly id: string;
  public readonly sucursalId: string;
  public readonly nombre: string;
  public readonly codigo: string;
  public readonly tipo: TipoBodega;
  public readonly activa: boolean;
  public readonly createdAt: Date;

  constructor(props: BodegaProps) {
    this.id = props.id;
    this.sucursalId = props.sucursalId;
    this.nombre = props.nombre;
    this.codigo = props.codigo;
    this.tipo = props.tipo ?? 'PRINCIPAL';
    this.activa = props.activa ?? true;
    this.createdAt = props.createdAt ?? new Date();
  }
}
