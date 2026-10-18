import { Permiso, Rol, Usuario, ModuloPermiso } from '../entities/auth.entity.js';

export interface IAuthRepository {
  listPermisos(schemaName: string, modulo?: ModuloPermiso): Promise<Permiso[]>;
  listRoles(schemaName: string): Promise<Rol[]>;
  getRolById(schemaName: string, id: string): Promise<Rol | null>;
  createRol(schemaName: string, rol: Rol, permisoIds: string[]): Promise<Rol>;
  updateRol(schemaName: string, id: string, datos: { nombre?: string; descripcion?: string; activo?: boolean }): Promise<Rol>;
  deleteRol(schemaName: string, id: string): Promise<void>;
  asignarPermisosARol(schemaName: string, rolId: string, permisoIds: string[]): Promise<void>;
  
  listUsuarios(schemaName: string): Promise<Usuario[]>;
  getUsuarioById(schemaName: string, id: string): Promise<Usuario | null>;
  autenticarPorPin(schemaName: string, pin: string): Promise<Usuario | null>;
  autenticarPorEmail(schemaName: string, email: string): Promise<Usuario | null>;
  createUsuario(schemaName: string, usuario: Usuario): Promise<Usuario>;
}
