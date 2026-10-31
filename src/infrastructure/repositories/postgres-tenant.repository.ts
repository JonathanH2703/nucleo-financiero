import { dbPool } from '../database/connection.js';
import { ITenantRepository } from '../../domain/repositories/tenant.repository.interface.js';
import { Tenant, TenantStatus } from '../../domain/entities/tenant.entity.js';

export class PostgresTenantRepository implements ITenantRepository {
  private mapRowToTenant(row: any): Tenant {
    return new Tenant({
      id: row.id,
      name: row.name,
      slug: row.slug,
      taxId: row.tax_id,
      schemaName: row.schema_name,
      status: row.status as TenantStatus,
      adminPin: row.admin_pin || '123456',
      storageQuotaBytes: Number(row.storage_quota_bytes),
      storageUsedBytes: Number(row.storage_used_bytes),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  public async findById(id: string): Promise<Tenant | null> {
    const res = await dbPool.query('SELECT * FROM public.tenants WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToTenant(res.rows[0]);
  }

  public async findBySlug(slug: string): Promise<Tenant | null> {
    const res = await dbPool.query('SELECT * FROM public.tenants WHERE slug = $1', [slug]);
    if (res.rows.length === 0) return null;
    return this.mapRowToTenant(res.rows[0]);
  }

  public async findByTaxId(taxId: string): Promise<Tenant | null> {
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
        id, name, slug, tax_id, schema_name, status, admin_pin,
        storage_quota_bytes, storage_used_bytes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      tenant.id,
      tenant.name,
      tenant.slug,
      tenant.taxId,
      tenant.schemaName,
      tenant.status,
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
        admin_pin = $5,
        storage_quota_bytes = $6,
        storage_used_bytes = $7,
        updated_at = $8
      WHERE id = $9
      RETURNING *;
    `;
    const values = [
      tenant.name,
      tenant.slug,
      tenant.taxId,
      tenant.status,
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
}
