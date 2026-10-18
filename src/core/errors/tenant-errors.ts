import { AppError } from './app-error.js';

export class TenantMissingError extends AppError {
  constructor() {
    super(
      'No se especificó la empresa/tenant en la petición. Proporcione la cabecera X-Tenant-ID o acceda vía subdominio.',
      400,
      'TENANT_MISSING'
    );
  }
}

export class TenantNotFoundError extends AppError {
  constructor(tenantId: string) {
    super(`La empresa/tenant "${tenantId}" no existe o se encuentra inactiva.`, 404, 'TENANT_NOT_FOUND');
  }
}

export class TenantSchemaError extends AppError {
  constructor(schemaName: string, details?: unknown) {
    super(
      `Error al acceder o aprovisionar el esquema de base de datos "${schemaName}".`,
      500,
      'TENANT_SCHEMA_ERROR',
      details
    );
  }
}

export class TenantQuotaExceededError extends AppError {
  constructor(usedBytes: number, quotaBytes: number) {
    const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
    const quotaMB = (quotaBytes / (1024 * 1024)).toFixed(2);
    super(
      `La empresa ha excedido su cuota de almacenamiento asignada (${usedMB} MB / ${quotaMB} MB).`,
      403,
      'TENANT_STORAGE_QUOTA_EXCEEDED'
    );
  }
}
