import { Request, Response, NextFunction } from 'express';
import { Usuario } from '../../../domain/entities/auth.entity.js';

export function requirePermission(codigoPermiso: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = (req as any).usuario as Usuario | undefined;

    if (!usuario) {
      // Si no se pasó usuario explícito por headers o token, se permite continuar si no hay usuario en sesión
      // o se retorna 401 si la ruta es estrictamente protegida
      res.status(401).json({
        success: false,
        error: 'NO_AUTENTICADO',
        message: 'Se requiere autenticación de usuario para ejecutar esta acción',
      });
      return;
    }

    if (usuario.puede(codigoPermiso)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'ACCESO_DENEGADO',
      message: `El usuario (${usuario.nombre} - ${usuario.rolNombre || usuario.rolSlug}) no posee el permiso requerido: ${codigoPermiso}`,
      permisoRequerido: codigoPermiso,
    });
  };
}
