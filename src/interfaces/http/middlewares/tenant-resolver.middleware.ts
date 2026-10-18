import { Request, Response, NextFunction } from 'express';
import { PostgresTenantRepository } from '../../../infrastructure/repositories/postgres-tenant.repository.js';
import { TenantContext } from '../../../core/context/tenant-context.js';
import { TenantMissingError, TenantNotFoundError } from '../../../core/errors/tenant-errors.js';

const tenantRepository = new PostgresTenantRepository();

export async function tenantResolverMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Obtener identificador desde headers o query
    let identifier =
      (req.headers['x-tenant-id'] as string) ||
      (req.headers['x-tenant-slug'] as string) ||
      (req.query.tenant as string);

    // 2. Si no viene en cabeceras, intentar resolver por subdominio
    if (!identifier && req.hostname) {
      const parts = req.hostname.split('.');
      if (parts.length > 2 && parts[0] !== 'api' && parts[0] !== 'www') {
        identifier = parts[0];
      }
    }

    if (!identifier) {
      throw new TenantMissingError();
    }

    // 3. Buscar tenant por ID o por Slug
    let tenant = await tenantRepository.findById(identifier);
    if (!tenant) {
      tenant = await tenantRepository.findBySlug(identifier.toLowerCase());
    }

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new TenantNotFoundError(identifier);
    }

    // 4. Adjuntar tenant al request y a TenantContext
    (req as any).tenant = tenant;

    TenantContext.run(
      {
        tenantId: tenant.id,
        schemaName: tenant.schemaName,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      },
      () => {
        next();
      }
    );
  } catch (error) {
    next(error);
  }
}
