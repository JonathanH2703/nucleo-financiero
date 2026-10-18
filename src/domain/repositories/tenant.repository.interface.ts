import { Tenant } from '../entities/tenant.entity.js';

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findByTaxId(taxId: string): Promise<Tenant | null>;
  create(tenant: Tenant): Promise<Tenant>;
  update(tenant: Tenant): Promise<Tenant>;
  listAll(): Promise<Tenant[]>;
}
