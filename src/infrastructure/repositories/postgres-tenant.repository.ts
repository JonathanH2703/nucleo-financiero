import { dbPool } from '../database/connection.js';
import { logger } from '../../core/logger/logger.js';
import {
  ITenantRepository,
  TenantStatsDTO,
  TenantDetalleDTO,
} from '../../domain/repositories/tenant.repository.interface.js';
import { Tenant, TenantPlan, TenantStatus } from '../../domain/entities/tenant.entity.js';

export const SYSTEM_MASTER_TENANT = new Tenant({
  id: 'tenant_system_master',
  name: 'Plataforma Núcleo Financiero',
  slug: 'public',
  taxId: '000000000',
  schemaName: 'public',
  status: 'ACTIVE' as TenantStatus,
  plan: 'intermedio' as TenantPlan,
  modulosActivos: [
    'dashboard',
    'pos',
    'inventario',
    'facturacion',
    'compras',
    'empresas',
    'contabilidad',
    'reportes',
    'tenants',
    'rbac',
    'ajustes',
  ],
  adminPin: '999999',
  storageQuotaBytes: 107374182400,
  storageUsedBytes: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

export class PostgresTenantRepository implements ITenantRepository {
  private mapRowToTenant(row: any): Tenant {
    let modulos: string[] = [];
    if (Array.isArray(row.modulos_activos)) {
      modulos = row.modulos_activos;
    } else if (typeof row.modulos_activos === 'string') {
      try {
        modulos = JSON.parse(row.modulos_activos);
      } catch {
        modulos = [];
      }
    }

    return new Tenant({
      id: row.id,
      name: row.name,
      slug: row.slug,
      taxId: row.tax_id,
      schemaName: row.schema_name,
      status: row.status as TenantStatus,
      plan: (row.plan || 'basico') as TenantPlan,
      modulosActivos: modulos,
      adminPin: row.admin_pin || '123456',
      storageQuotaBytes: Number(row.storage_quota_bytes || 5368709120),
      storageUsedBytes: Number(row.storage_used_bytes || 0),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  public async findById(id: string): Promise<Tenant | null> {
    if (id === 'tenant_system_master' || id === 'public') {
      return SYSTEM_MASTER_TENANT;
    }
    const res = await dbPool.query('SELECT * FROM public.tenants WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToTenant(res.rows[0]);
  }

  public async findBySlug(slug: string): Promise<Tenant | null> {
    const clean = String(slug || '').trim().toLowerCase();
    if (clean === 'public') {
      return SYSTEM_MASTER_TENANT;
    }
    const res = await dbPool.query('SELECT * FROM public.tenants WHERE slug = $1', [clean]);
    if (res.rows.length === 0) return null;
    return this.mapRowToTenant(res.rows[0]);
  }

  public async findByTaxId(taxId: string): Promise<Tenant | null> {
    if (String(taxId || '').trim() === '000000000') {
      return SYSTEM_MASTER_TENANT;
    }
    const clean = taxId.replace(/[^0-9a-zA-Z]/g, '');
    const res = await dbPool.query(
      `SELECT * FROM public.tenants 
       WHERE tax_id = $1 
          OR regexp_replace(tax_id, '[^0-9a-zA-Z]', '', 'g') = $2`,
      [taxId.trim(), clean]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToTenant(res.rows[0]);
  }

  public async create(tenant: Tenant): Promise<Tenant> {
    const query = `
      INSERT INTO public.tenants (
        id, name, slug, tax_id, schema_name, status, plan, modulos_activos, admin_pin,
        storage_quota_bytes, storage_used_bytes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const values = [
      tenant.id,
      tenant.name,
      tenant.slug,
      tenant.taxId,
      tenant.schemaName,
      tenant.status,
      tenant.plan,
      JSON.stringify(tenant.modulosActivos),
      tenant.adminPin || '123456',
      tenant.storageQuotaBytes,
      tenant.storageUsedBytes,
      tenant.createdAt,
      tenant.updatedAt,
    ];

    const res = await dbPool.query(query, values);
    return this.mapRowToTenant(res.rows[0]);
  }

  public async update(tenant: Tenant): Promise<Tenant> {
    const query = `
      UPDATE public.tenants SET
        name = $1,
        slug = $2,
        tax_id = $3,
        status = $4,
        plan = $5,
        modulos_activos = $6,
        admin_pin = $7,
        storage_quota_bytes = $8,
        storage_used_bytes = $9,
        updated_at = $10
      WHERE id = $11
      RETURNING *;
    `;
    const values = [
      tenant.name,
      tenant.slug,
      tenant.taxId,
      tenant.status,
      tenant.plan,
      JSON.stringify(tenant.modulosActivos),
      tenant.adminPin || '123456',
      tenant.storageQuotaBytes,
      tenant.storageUsedBytes,
      new Date(),
      tenant.id,
    ];

    const res = await dbPool.query(query, values);
    return this.mapRowToTenant(res.rows[0]);
  }

  public async listAll(): Promise<Tenant[]> {
    const res = await dbPool.query('SELECT * FROM public.tenants ORDER BY created_at DESC');
    return res.rows.map((row) => this.mapRowToTenant(row));
  }

  public async listAllWithStats(): Promise<TenantStatsDTO[]> {
    const tenants = await this.listAll();
    const result: TenantStatsDTO[] = [];

    for (const tenant of tenants) {
      let sucursalesCount = 0;
      let usuariosCount = 0;

      try {
        const sucRes = await dbPool.query(`
          SELECT COUNT(*)::int AS count 
          FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'sucursales'
        `, [tenant.schemaName]);

        if (sucRes.rows[0]?.count > 0) {
          const countRes = await dbPool.query(`SELECT COUNT(*)::int AS total FROM "${tenant.schemaName}".sucursales`);
          sucursalesCount = countRes.rows[0]?.total || 0;
        }

        const usrRes = await dbPool.query(`
          SELECT COUNT(*)::int AS count 
          FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'usuarios'
        `, [tenant.schemaName]);

        if (usrRes.rows[0]?.count > 0) {
          const countRes = await dbPool.query(`SELECT COUNT(*)::int AS total FROM "${tenant.schemaName}".usuarios`);
          usuariosCount = countRes.rows[0]?.total || 0;
        }
      } catch {
        // En caso de que el esquema aún no esté inicializado
      }

      result.push({
        tenant,
        sucursalesCount,
        usuariosCount,
      });
    }

    return result;
  }

  public async getTenantDetalle(id: string): Promise<TenantDetalleDTO | null> {
    const tenant = await this.findById(id);
    if (!tenant) return null;

    let sucursales: any[] = [];
    let usuarios: any[] = [];

    try {
      const sucRes = await dbPool.query(
        `SELECT id, nombre, codigo, direccion, telefono, ciudad, pin_acceso, activa 
         FROM "${tenant.schemaName}".sucursales ORDER BY created_at ASC`
      );
      sucursales = sucRes.rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        codigo: r.codigo,
        direccion: r.direccion,
        telefono: r.telefono,
        ciudad: r.ciudad,
        pinAcceso: r.pin_acceso,
        activo: r.activa,
      }));
    } catch (err: any) {
      logger.warn({ err: err?.message, schema: tenant.schemaName }, 'getTenantDetalle: error leyendo sucursales');
    }

    try {
      const usrRes = await dbPool.query(
        `SELECT u.id, u.nombre, u.email, u.activo, u.sucursal_id, r.nombre as rol_nombre, r.slug as rol_slug
         FROM "${tenant.schemaName}".usuarios u
         LEFT JOIN "${tenant.schemaName}".roles r ON u.rol_id = r.id
         ORDER BY u.created_at ASC`
      );
      usuarios = usrRes.rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        email: r.email,
        activo: r.activo,
        sucursalId: r.sucursal_id,
        rolNombre: r.rol_nombre,
        rolSlug: r.rol_slug,
      }));
    } catch (err: any) {
      logger.warn({ err: err?.message, schema: tenant.schemaName }, 'getTenantDetalle: error leyendo usuarios');
    }

    return {
      tenant,
      sucursales,
      usuarios,
      sucursalesCount: sucursales.length,
      usuariosCount: usuarios.length,
    };
  }

  public async listAllSucursalesGlobal(): Promise<any[]> {
    const tenants = await this.listAll();
    const allSucursales: any[] = [];

    for (const tenant of tenants) {
      try {
        const res = await dbPool.query(
          `SELECT id, nombre, codigo, direccion, telefono, ciudad, pin_acceso, activa
           FROM "${tenant.schemaName}".sucursales ORDER BY created_at ASC`
        );
        for (const row of res.rows) {
          allSucursales.push({
            id: row.id,
            nombre: row.nombre,
            codigo: row.codigo,
            direccion: row.direccion,
            telefono: row.telefono,
            ciudad: row.ciudad,
            pinAcceso: row.pin_acceso,
            activo: row.activa,
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
          });
        }
      } catch (err: any) {
        logger.warn({ err: err?.message, schema: tenant.schemaName }, 'listAllSucursalesGlobal: error leyendo sucursales');
      }
    }

    return allSucursales;
  }
}
