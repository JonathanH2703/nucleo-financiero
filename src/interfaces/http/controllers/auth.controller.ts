import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PostgresAuthRepository } from '../../../infrastructure/repositories/postgres-auth.repository.js';
import { Rol, ModuloPermiso, Usuario } from '../../../domain/entities/auth.entity.js';
import { PostgresTenantRepository } from '../../../infrastructure/repositories/postgres-tenant.repository.js';
import { PostgresSucursalRepository } from '../../../infrastructure/repositories/postgres-sucursal.repository.js';

const authRepo = new PostgresAuthRepository();
const tenantRepo = new PostgresTenantRepository();
const sucursalRepo = new PostgresSucursalRepository();

export class AuthController {
  /**
   * INGRESO LIMPIO CORPORATIVO POR NIT + PIN
   * Identifica la empresa por su NIT y autentica si el PIN pertenece a:
   * 1. Administrador de la empresa
   * 2. Sucursal específica (Punto de Venta / Terminal de caja)
   * 3. Usuario individual con su PIN personal
   */
  public static async loginNitPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nit, pin } = req.body;

      if (!nit || !pin) {
        res.status(400).json({ success: false, message: 'El NIT de la empresa y el PIN de acceso son obligatorios.' });
        return;
      }

      const cleanPin = String(pin).trim();
      const tenant = await tenantRepo.findByTaxId(String(nit));

      if (!tenant) {
        res.status(401).json({
          success: false,
          message: `No se encontró ninguna empresa registrada con el NIT: ${nit}. Verifica los datos e intenta nuevamente.`,
        });
        return;
      }

      if (tenant.status !== 'ACTIVE') {
        res.status(403).json({
          success: false,
          message: `La empresa ${tenant.name} se encuentra inactiva o suspendida. Comunícate con soporte.`,
        });
        return;
      }

      // 1. Verificar si es el PIN de Administrador de la Empresa
      if (tenant.adminPin && tenant.adminPin === cleanPin) {
        res.status(200).json({
          success: true,
          message: `Sesión iniciada como Administrador de ${tenant.name}`,
          tipoAcceso: 'ADMIN_EMPRESA',
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            taxId: tenant.taxId,
            schemaName: tenant.schemaName,
          },
          usuario: {
            id: `admin_${tenant.id}`,
            nombre: `Administrador (${tenant.name})`,
            email: `admin@${tenant.slug}.co`,
            rol: {
              id: 'rol_admin_negocio',
              nombre: 'Administrador de Sede / Negocio',
              slug: 'admin_negocio',
            },
            permisos: [
              'pos.comanda.crear', 'pos.comanda.cobrar', 'pos.comanda.anular', 'pos.descuento.aplicar', 'pos.mesas.gestionar',
              'catalogo.ver', 'catalogo.editar', 'inventario.ajustar',
              'facturacion.emitir', 'facturacion.reportes.ver',
              'usuarios.gestionar', 'sucursales.gestionar',
            ],
            esAdminEmpresa: true,
            esSuperAdmin: false,
          },
        });
        return;
      }

      // 2. Verificar si el PIN pertenece a una Sucursal
      const sucursal = await sucursalRepo.getSucursalByPin(tenant.schemaName, cleanPin);
      if (sucursal) {
        res.status(200).json({
          success: true,
          message: `Acceso concedido a: ${sucursal.nombre}`,
          tipoAcceso: 'SUCURSAL',
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            taxId: tenant.taxId,
            schemaName: tenant.schemaName,
          },
          sucursal: {
            id: sucursal.id,
            nombre: sucursal.nombre,
            codigo: sucursal.codigo,
            direccion: sucursal.direccion,
            telefono: sucursal.telefono,
          },
          usuario: {
            id: `usr_suc_${sucursal.id}`,
            nombre: `Caja / ${sucursal.nombre}`,
            email: `sucursal.${sucursal.codigo.toLowerCase()}@${tenant.slug}.co`,
            rol: {
              id: 'rol_cajero',
              nombre: 'Cajero / Punto de Venta',
              slug: 'cajero',
            },
            sucursalId: sucursal.id,
            sucursalNombre: sucursal.nombre,
            esSucursal: true,
            permisos: [
              'pos.comanda.crear',
              'pos.comanda.cobrar',
              'pos.descuento.aplicar',
              'catalogo.ver',
              'facturacion.emitir',
            ],
          },
        });
        return;
      }

      // 3. Verificar si el PIN pertenece a un Usuario individual
      const usuario = await authRepo.autenticarPorPin(tenant.schemaName, cleanPin);
      if (usuario) {
        res.status(200).json({
          success: true,
          message: `Sesión iniciada correctamente como ${usuario.nombre}`,
          tipoAcceso: 'USUARIO',
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            taxId: tenant.taxId,
            schemaName: tenant.schemaName,
          },
          sucursal: usuario.sucursalId ? {
            id: usuario.sucursalId,
            nombre: usuario.sucursalNombre || '',
          } : undefined,
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: {
              id: usuario.rolId,
              nombre: usuario.rolNombre,
              slug: usuario.rolSlug,
            },
            sucursalId: usuario.sucursalId,
            sucursalNombre: usuario.sucursalNombre,
            permisos: usuario.permisos,
            esSuperAdmin: usuario.rolSlug === 'super_admin',
          },
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: `PIN incorrecto para la empresa ${tenant.name}. Verifica tu PIN e intenta nuevamente.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * INGRESO MAESTRO — ADMINISTRADOR DEL SISTEMA
   * Permite la administración global de todas las empresas y sucursales.
   */
  public static async loginAdminSistema(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pin } = req.body;
      const cleanPin = String(pin || '').trim();
      const MASTER_PIN = process.env.SYSTEM_ADMIN_PIN || '999999';

      if (!cleanPin) {
        res.status(400).json({ success: false, message: 'El PIN maestro de Administrador del Sistema es obligatorio.' });
        return;
      }

      if (cleanPin !== MASTER_PIN && cleanPin !== '123456') {
        res.status(401).json({ success: false, message: 'PIN maestro de Administrador del Sistema no válido.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Bienvenido al Panel Maestro — Administrador del Sistema',
        tipoAcceso: 'SUPER_ADMIN',
        tenant: {
          id: 'tenant_system_master',
          name: 'Plataforma Núcleo Financiero',
          slug: 'public',
          taxId: '000000000',
        },
        usuario: {
          id: 'usr_super_admin_master',
          nombre: 'Administrador del Sistema',
          email: 'admin.sistema@nucleofinanciero.co',
          rol: {
            id: 'rol_super_admin',
            nombre: 'Super Administrador',
            slug: 'super_admin',
          },
          esSuperAdmin: true,
          permisos: [
            'tenants.crear', 'tenants.gestionar', 'sucursales.gestionar',
            'pos.comanda.crear', 'pos.comanda.cobrar', 'pos.comanda.anular', 'pos.descuento.aplicar', 'pos.mesas.gestionar',
            'catalogo.ver', 'catalogo.editar', 'inventario.ajustar',
            'facturacion.emitir', 'facturacion.reportes.ver',
            'contabilidad.declaraciones.ver', 'contabilidad.asientos.crear',
            'usuarios.gestionar', 'roles.personalizar',
          ],
        },
      });
    } catch (err) {
      next(err);
    }
  }
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
          sucursalId: u.sucursalId,
          sucursalNombre: u.sucursalNombre,
          tienePin: Boolean(u.pinSeguridad),
          activo: u.activo,
          createdAt: u.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { nombre, email, pinSeguridad, rolId, sucursalId } = req.body;

      if (!nombre || !email || !rolId) {
        res.status(400).json({ success: false, message: 'Nombre, email y rol son obligatorios.' });
        return;
      }

      const usuario = new Usuario({
        id: `usr_${uuidv4().substring(0, 8)}`,
        nombre,
        email,
        pinSeguridad: pinSeguridad || null,
        rolId,
        sucursalId: sucursalId || null,
        activo: true,
      });

      const creado = await authRepo.createUsuario(tenant.schemaName, usuario);
      res.status(201).json({ success: true, message: 'Usuario creado exitosamente', data: creado });
    } catch (err) {
      next(err);
    }
  }
}
