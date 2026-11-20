import { Tenant } from '../entities/tenant.entity.js';

export interface TenantStatsDTO {
  tenant: Tenant;
  sucursalesCount: number;
  usuariosCount: number;
}

export interface TenantDetalleDTO {
  tenant: Tenant;
  sucursales: any[];
  usuarios: any[];
  sucursalesCount: number;
  usuariosCount: number;
}

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findByTaxId(taxId: string): Promise<Tenant | null>;
  create(tenant: Tenant): Promise<Tenant>;
  update(tenant: Tenant): Promise<Tenant>;
  listAll(): Promise<Tenant[]>;
  listAllWithStats(): Promise<TenantStatsDTO[]>;
  getTenantDetalle(id: string): Promise<TenantDetalleDTO | null>;
}
