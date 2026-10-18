import { Router } from 'express';
import { FacturacionController } from '../controllers/facturacion.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const facturacionRouter = Router();

// Todas las rutas de facturación requieren contexto de tenant
facturacionRouter.use(tenantResolverMiddleware);

facturacionRouter.get('/documentos', FacturacionController.listFacturas);
facturacionRouter.get('/documentos/:id', FacturacionController.getFacturaById);
