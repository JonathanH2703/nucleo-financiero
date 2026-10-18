import { Router } from 'express';
import { PosController } from '../controllers/pos.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const posRouter = Router();

// Todas las rutas del POS requieren contexto de empresa / tenant
posRouter.use(tenantResolverMiddleware);

// Catálogo de productos y categorías (soporta filtro por categoriaId, search o código de barras)
posRouter.get('/catalogo', PosController.getCatalogo);

// Áreas y puntos de atención (mesas, cajas, vitrinas)
posRouter.get('/operacion', PosController.getOperacion);

// Comandas / Ventas
posRouter.post('/comandas', PosController.createComanda);
posRouter.get('/comandas', PosController.listComandasActivas);
posRouter.post('/comandas/:comandaId/cobrar', PosController.cobrarComanda);

// Monitor de Cocina KDS
posRouter.get('/kds', PosController.getKdsQueue);
posRouter.patch('/kds/items/:itemId', PosController.updateKdsItem);
