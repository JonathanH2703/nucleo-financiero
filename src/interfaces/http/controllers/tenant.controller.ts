import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PostgresTenantRepository } from '../../../infrastructure/repositories/postgres-tenant.repository.js';
import { CreateTenantUseCase } from '../../../application/use-cases/tenant/create-tenant.use-case.js';
import { ListTenantsUseCase } from '../../../application/use-cases/tenant/list-tenants.use-case.js';

const tenantRepository = new PostgresTenantRepository();
const createTenantUseCase = new CreateTenantUseCase(tenantRepository);
const listTenantsUseCase = new ListTenantsUseCase(tenantRepository);

const createTenantSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .regex(/^[a-z0-9_-]+$/, 'El slug solo puede contener letras minúsculas, números, guiones y guiones bajos'),
  taxId: z.string().min(4, 'El NIT o identificación fiscal debe ser válido'),
  adminPin: z.string().min(4, 'El PIN debe tener al menos 4 dígitos').optional(),
  storageQuotaBytes: z.number().positive().optional(),
});

export class TenantController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createTenantSchema.parse(req.body);
      const tenant = await createTenantUseCase.execute(validated);

      res.status(201).json({
        success: true,
        message: 'Empresa aprovisionada exitosamente con esquema de base de datos aislado.',
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenants = await listTenantsUseCase.execute();
      res.json({
        success: true,
        total: tenants.length,
        data: tenants,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const tenant = await tenantRepository.findById(id);
      if (!tenant) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada' });
        return;
      }

      if (req.body.name) tenant.name = req.body.name;
      if (req.body.taxId) tenant.taxId = req.body.taxId;
      if (req.body.adminPin) tenant.adminPin = req.body.adminPin;
      if (req.body.status) tenant.status = req.body.status;

      const updated = await tenantRepository.update(tenant);
      res.json({ success: true, message: 'Empresa actualizada exitosamente', data: updated });
    } catch (error) {
      next(error);
    }
  }
}
