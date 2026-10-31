import { Router } from 'express';
import { ComprasController } from '../controllers/compras.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const comprasRouter = Router();

comprasRouter.use(tenantResolverMiddleware);

// Órdenes de Compra
comprasRouter.get('/ordenes', ComprasController.listOrdenes);
comprasRouter.post('/ordenes', ComprasController.createOrden);
comprasRouter.get('/ordenes/:id', ComprasController.getOrdenById);
comprasRouter.put('/ordenes/:id', ComprasController.updateOrden);

// Recepciones de Mercancía (Formal o Directa)
comprasRouter.post('/recepciones', ComprasController.registrarRecepcion);
comprasRouter.get('/recepciones/:id', ComprasController.getRecepcionById);
comprasRouter.get('/ordenes/:ordenId/recepciones', ComprasController.listRecepcionesByOrden);

// Cuentas por Pagar (Proveedores)
comprasRouter.get('/cuentas-por-pagar', ComprasController.listCuentasPorPagar);
comprasRouter.post('/cuentas-por-pagar/:id/pago', ComprasController.registrarPago);

