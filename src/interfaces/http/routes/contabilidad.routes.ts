import { Router } from 'express';
import { ContabilidadController } from '../controllers/contabilidad.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const contabilidadRouter = Router();

contabilidadRouter.use(tenantResolverMiddleware);

contabilidadRouter.get('/libro-diario', ContabilidadController.getLibroDiario);
contabilidadRouter.post('/asientos', ContabilidadController.createAsiento);
contabilidadRouter.get('/puc', ContabilidadController.getPuc);
contabilidadRouter.get('/balance-prueba', ContabilidadController.getBalancePrueba);
contabilidadRouter.get('/liquidacion-impuestos', ContabilidadController.getLiquidacionImpuestos);
