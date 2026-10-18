import { v4 as uuidv4 } from 'uuid';
import { ITenantRepository } from '../../../domain/repositories/tenant.repository.interface.js';
import { Tenant } from '../../../domain/entities/tenant.entity.js';
import { TenantSchemaManager } from '../../../infrastructure/database/tenant-schema-manager.js';
import { AppError } from '../../../core/errors/app-error.js';
import { logger } from '../../../core/logger/logger.js';

export interface CreateTenantDTO {
  name: string;
  slug: string;
  taxId: string;
  storageQuotaBytes?: number;
}

export class CreateTenantUseCase {
  constructor(private readonly tenantRepository: ITenantRepository) {}

  public async execute(dto: CreateTenantDTO): Promise<Tenant> {
    const existingSlug = await this.tenantRepository.findBySlug(dto.slug);
    if (existingSlug) {
      throw new AppError(`El slug "${dto.slug}" ya está registrado para otra empresa.`, 409, 'TENANT_SLUG_EXISTS');
    }

    const existingTaxId = await this.tenantRepository.findByTaxId(dto.taxId);
    if (existingTaxId) {
      throw new AppError(`El NIT/identificación fiscal "${dto.taxId}" ya está registrado.`, 409, 'TENANT_TAX_ID_EXISTS');
    }

    const tenantId = uuidv4();
    const schemaName = Tenant.sanitizeSchemaName(dto.slug);

    // 1. Aprovisionar esquema PostgreSQL aislado para este cliente
    logger.info({ tenantId, schemaName }, 'Iniciando aprovisionamiento de esquema de base de datos...');
    await TenantSchemaManager.provisionTenantSchema(schemaName);

    // 2. Registrar en public.tenants
    const tenant = new Tenant({
      id: tenantId,
      name: dto.name,
      slug: dto.slug.toLowerCase().trim(),
      taxId: dto.taxId.trim(),
      schemaName,
      status: 'ACTIVE',
      storageQuotaBytes: dto.storageQuotaBytes || 5368709120, // 5 GB por defecto
      storageUsedBytes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedTenant = await this.tenantRepository.create(tenant);
    logger.info({ tenantId: savedTenant.id, schemaName }, 'Empresa/Tenant creada y aprovisionada exitosamente');

    return savedTenant;
  }
}
