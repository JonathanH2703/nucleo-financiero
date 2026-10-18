export type TipoPuntoAtencion = 'MESA' | 'MOSTRADOR' | 'VITRINA' | 'BARRA';
export type EstadoPuntoAtencion = 'LIBRE' | 'OCUPADO' | 'RESERVADO' | 'ESPERANDO_CUENTA';

export interface AreaOperativaProps {
  id: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export class AreaOperativa {
  public readonly id: string;
  public readonly nombre: string;
  public readonly descripcion?: string;
  public readonly activo: boolean;

  constructor(props: AreaOperativaProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.descripcion = props.descripcion;
    this.activo = props.activo ?? true;
  }
}

export interface PuntoAtencionProps {
  id: string;
  areaId: string;
  nombre: string;
  codigo: string;
  tipo: TipoPuntoAtencion;
  capacidad?: number;
  estado?: EstadoPuntoAtencion;
  activo?: boolean;
}

export class PuntoAtencion {
  public readonly id: string;
  public readonly areaId: string;
  public readonly nombre: string;
  public readonly codigo: string;
  public readonly tipo: TipoPuntoAtencion;
  public readonly capacidad: number;
  public estado: EstadoPuntoAtencion;
  public readonly activo: boolean;

  constructor(props: PuntoAtencionProps) {
    this.id = props.id;
    this.areaId = props.areaId;
    this.nombre = props.nombre;
    this.codigo = props.codigo;
    this.tipo = props.tipo;
    this.capacidad = props.capacidad ?? 4;
    this.estado = props.estado ?? 'LIBRE';
    this.activo = props.activo ?? true;
  }

  public ocupar(): void {
    this.estado = 'OCUPADO';
  }

  public solicitarCuenta(): void {
    this.estado = 'ESPERANDO_CUENTA';
  }

  public liberar(): void {
    this.estado = 'LIBRE';
  }
}
