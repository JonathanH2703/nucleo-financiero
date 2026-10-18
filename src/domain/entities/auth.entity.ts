export type ModuloPermiso = 
  | 'POS' 
  | 'KDS' 
  | 'FACTURACION' 
  | 'CONTABILIDAD' 
  | 'INVENTARIO' 
  | 'CRM_TERCEROS' 
  | 'USUARIOS_ROLES' 
  | 'CONFIGURACION';

export interface PermisoProps {
  id: string;
  modulo: ModuloPermiso;
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export class Permiso {
  public readonly id: string;
  public readonly modulo: ModuloPermiso;
  public readonly codigo: string;
  public readonly nombre: string;
  public readonly descripcion?: string;

  constructor(props: PermisoProps) {
    this.id = props.id;
    this.modulo = props.modulo;
    this.codigo = props.codigo;
    this.nombre = props.nombre;
    this.descripcion = props.descripcion;
  }
}

export interface RolProps {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  esSistema?: boolean; // True para roles base predefinidos; False para roles personalizados por el cliente
  activo?: boolean;
  permisos?: Permiso[];
  createdAt?: Date;
}

export class Rol {
  public readonly id: string;
  public nombre: string;
  public readonly slug: string;
  public descripcion?: string;
  public readonly esSistema: boolean;
  public activo: boolean;
  public permisos: Permiso[];
  public readonly createdAt: Date;

  constructor(props: RolProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.slug = props.slug;
    this.descripcion = props.descripcion;
    this.esSistema = props.esSistema ?? false;
    this.activo = props.activo ?? true;
    this.permisos = props.permisos ?? [];
    this.createdAt = props.createdAt ?? new Date();
  }

  public tienePermiso(codigoPermiso: string): boolean {
    if (this.slug === 'super_admin') return true; // Super admin tiene acceso universal irrestricto
    return this.permisos.some((p) => p.codigo === codigoPermiso);
  }

  public asignarPermisos(nuevosPermisos: Permiso[]): void {
    this.permisos = nuevosPermisos;
  }
}

export interface UsuarioProps {
  id: string;
  nombre: string;
  email: string;
  pinSeguridad?: string; // PIN de 4 a 6 dígitos para ingreso rápido en pantallas POS táctiles
  rolId: string;
  rolNombre?: string;
  rolSlug?: string;
  permisos?: string[]; // Lista de códigos de permiso directos
  areaAsignadaId?: string;
  activo?: boolean;
  createdAt?: Date;
}

export class Usuario {
  public readonly id: string;
  public nombre: string;
  public email: string;
  public pinSeguridad?: string;
  public rolId: string;
  public rolNombre?: string;
  public rolSlug?: string;
  public permisos: string[];
  public areaAsignadaId?: string;
  public activo: boolean;
  public readonly createdAt: Date;

  constructor(props: UsuarioProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.email = props.email;
    this.pinSeguridad = props.pinSeguridad;
    this.rolId = props.rolId;
    this.rolNombre = props.rolNombre;
    this.rolSlug = props.rolSlug;
    this.permisos = props.permisos ?? [];
    this.areaAsignadaId = props.areaAsignadaId;
    this.activo = props.activo ?? true;
    this.createdAt = props.createdAt ?? new Date();
  }

  public puede(codigoPermiso: string): boolean {
    if (this.rolSlug === 'super_admin') return true;
    return this.permisos.includes(codigoPermiso);
  }
}
