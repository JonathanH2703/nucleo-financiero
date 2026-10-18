import { describe, it, expect } from 'vitest';
import { Tenant } from '../src/domain/entities/tenant.entity.js';
import { StorageFile } from '../src/domain/entities/storage-file.entity.js';
import { S3StorageService } from '../src/infrastructure/storage/s3-storage.service.js';

describe('Tenant Domain Entity', () => {
  it('debe sanitizar correctamente el nombre de esquema para PostgreSQL', () => {
    expect(Tenant.sanitizeSchemaName('empresa-demo.com')).toBe('tenant_empresa_demo_com');
    expect(Tenant.sanitizeSchemaName('ACME_CORP_2026')).toBe('tenant_acme_corp_2026');
  });

  it('debe validar la cuota disponible del tenant adecuadamente', () => {
    const tenant = new Tenant({
      id: 't-123',
      name: 'Empresa Test',
      slug: 'empresa_test',
      taxId: '900123456-1',
      schemaName: 'tenant_empresa_test',
      status: 'ACTIVE',
      storageQuotaBytes: 1000,
      storageUsedBytes: 800,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(tenant.hasAvailableQuota(100)).toBe(true);
    expect(tenant.hasAvailableQuota(200)).toBe(true);
    expect(tenant.hasAvailableQuota(201)).toBe(false);

    tenant.addStorageUsage(150);
    expect(tenant.storageUsedBytes).toBe(950);

    tenant.reduceStorageUsage(500);
    expect(tenant.storageUsedBytes).toBe(450);
  });
});

describe('S3 Storage Key Generation', () => {
  it('debe generar claves de bucket aisladas con prefijo de tenant y fecha', () => {
    const storageService = new S3StorageService();
    const key = storageService.buildTenantKey('tenant_xyz', 'facturacion', 'factura final (copia).pdf');

    expect(key).toMatch(/^tenants\/tenant_xyz\/facturacion\/\d{4}\/\d{2}\/[a-f0-9-]+_factura_final__copia_.pdf$/);
  });
});

describe('StorageFile Domain Entity', () => {
  it('debe actualizar su estado al confirmarse la carga en el bucket', () => {
    const file = new StorageFile({
      id: 'f-1',
      tenantId: 't-123',
      originalName: 'factura_electronica.xml',
      storedKey: 'tenants/t-123/facturacion/2026/10/factura.xml',
      bucketName: 'nucleo-dev',
      mimeType: 'application/xml',
      sizeBytes: 0,
      category: 'facturacion',
      status: 'PENDING_UPLOAD',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(file.status).toBe('PENDING_UPLOAD');

    file.markAsActive(15240, 'etag12345');

    expect(file.status).toBe('ACTIVE');
    expect(file.sizeBytes).toBe(15240);
    expect(file.checksumSha256).toBe('etag12345');
  });
});
