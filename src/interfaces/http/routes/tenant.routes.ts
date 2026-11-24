import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller.js';

export const tenantRouter = Router();

// Endpoints de administración global de inquilinos
tenantRouter.post('/', TenantController.create);
tenantRouter.get('/', TenantController.list);
tenantRouter.get('/sucursales-global', TenantController.listAllSucursales);
tenantRouter.get('/:id/detalle', TenantController.getDetalle);
tenantRouter.put('/:id', TenantController.update);
