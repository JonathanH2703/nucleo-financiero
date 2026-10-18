import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PostgresAuthRepository } from '../../../infrastructure/repositories/postgres-auth.repository.js';
import { Rol, ModuloPermiso } from '../../../domain/entities/auth.entity.js';

const authRepo = new PostgresAuthRepository();

export class AuthController {
  public static async listPermisos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { modulo } = req.query;

      const permisos = await authRepo.listPermisos(
        tenant.schemaName,
        modulo as ModuloPermiso | undefined
      );

      // Agrupados por módulo para fácil rendering en UI
      const agrupados = permisos.reduce((acc: Record<string, any[]>, p) => {
        if (!acc[p.modulo]) acc[p.modulo] = [];
        acc[p.modulo].push({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          descripcion: p.descripcion,
        });
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        total: permisos.length,
        modulos: agrupados,
        permisos,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const roles = await authRepo.listRoles(tenant.schemaName);

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        count: roles.length,
        data: roles.map((r) => ({
          id: r.id,
          nombre: r.nombre,
          slug: r.slug,
          descripcion: r.descripcion,
          esSistema: r.esSistema,
          activo: r.activo,
          permisosCount: r.permisos.length,
          permisos: r.permisos.map((p) => ({
            id: p.id,
            modulo: p.modulo,
            codigo: p.codigo,
            nombre: p.nombre,
          })),
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createRol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { nombre, slug, descripcion, permisoIds } = req.body;

      if (!nombre || !slug) {
        res.status(400).json({ success: false, message: 'Nombre y slug del rol son obligatorios' });
        return;
      }

      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const rol = new Rol({
        id: uuidv4(),
        nombre,
        slug: cleanSlug,
        descripcion,
        esSistema: false,
        activo: true,
      });

      await authRepo.createRol(tenant.schemaName, rol, permisoIds || []);

      const creado = await authRepo.getRolById(tenant.schemaName, rol.id);

      res.status(201).json({
        success: true,
        message: 'Rol personalizado creado exitosamente',
        data: creado,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateRol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const rolId = String(req.params.rolId);
      const { nombre, descripcion, activo, permisoIds } = req.body;

      await authRepo.updateRol(tenant.schemaName, rolId, {
        nombre,
        descripcion,
        activo,
      });

      if (Array.isArray(permisoIds)) {
        await authRepo.asignarPermisosARol(tenant.schemaName, rolId, permisoIds);
      }

      const finalRol = await authRepo.getRolById(tenant.schemaName, rolId);

      res.status(200).json({
        success: true,
        message: 'Rol actualizado exitosamente',
        data: finalRol,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteRol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const rolId = String(req.params.rolId);

      await authRepo.deleteRol(tenant.schemaName, rolId);

      res.status(200).json({
        success: true,
        message: 'Rol desactivado exitosamente',
      });
    } catch (err) {
      next(err);
    }
  }

  public static async loginPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { pin } = req.body;

      if (!pin) {
        res.status(400).json({ success: false, message: 'El PIN de seguridad es obligatorio' });
        return;
      }

      const usuario = await authRepo.autenticarPorPin(tenant.schemaName, String(pin));
      if (!usuario) {
        res.status(401).json({ success: false, message: 'PIN incorrecto o usuario inactivo' });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Sesión iniciada correctamente como ${usuario.nombre}`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: {
            id: usuario.rolId,
            nombre: usuario.rolNombre,
            slug: usuario.rolSlug,
          },
          permisos: usuario.permisos,
          esSuperAdmin: usuario.rolSlug === 'super_admin',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async loginEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ success: false, message: 'El correo electrónico es obligatorio' });
        return;
      }

      const usuario = await authRepo.autenticarPorEmail(tenant.schemaName, String(email));
      if (!usuario) {
        res.status(401).json({ success: false, message: 'Credenciales inválidas o usuario inactivo' });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Sesión iniciada correctamente como ${usuario.nombre}`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: {
            id: usuario.rolId,
            nombre: usuario.rolNombre,
            slug: usuario.rolSlug,
          },
          permisos: usuario.permisos,
          esSuperAdmin: usuario.rolSlug === 'super_admin',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listUsuarios(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const usuarios = await authRepo.listUsuarios(tenant.schemaName);

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        count: usuarios.length,
        data: usuarios.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: {
            id: u.rolId,
            nombre: u.rolNombre,
            slug: u.rolSlug,
          },
          tienePin: Boolean(u.pinSeguridad),
          activo: u.activo,
          createdAt: u.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
}
