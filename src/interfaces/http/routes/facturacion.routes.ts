import { Router } from 'express';
import { FacturacionController } from '../controllers/facturacion.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const facturacionRouter = Router();

// Todas las rutas de facturación requieren contexto de tenant
facturacionRouter.use(tenantResolverMiddleware);

// Resumen financiero (dashboard widget)
facturacionRouter.get('/resumen', FacturacionController.getResumen);

// CRUD de documentos fiscales
facturacionRouter.get('/documentos', FacturacionController.listFacturas);
facturacionRouter.post('/documentos', FacturacionController.emitirFacturaDirecta);
facturacionRouter.get('/documentos/:id', FacturacionController.getFacturaById);

// Operaciones sobre facturas
facturacionRouter.post('/documentos/:id/anular', FacturacionController.anularFactura);
facturacionRouter.post('/documentos/:id/pago', FacturacionController.registrarPago);
