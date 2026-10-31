import { Router } from 'express';
import { InventarioController } from '../controllers/inventario.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const inventarioRouter = Router();

inventarioRouter.use(tenantResolverMiddleware);

// Kardex y Movimientos
inventarioRouter.get('/kardex', InventarioController.getKardex);
inventarioRouter.post('/movimientos', InventarioController.registrarMovimiento);

// Stock y Alertas
inventarioRouter.get('/stock/:productoId', InventarioController.getStockProducto);
inventarioRouter.get('/stock-bajo', InventarioController.getStockBajo);

// Ajustes de Inventario
inventarioRouter.post('/ajustes', InventarioController.crearAjuste);
inventarioRouter.get('/ajustes', InventarioController.listAjustes);
inventarioRouter.get('/ajustes/:id', InventarioController.getAjusteById);
inventarioRouter.put('/ajustes/:id/confirmar', InventarioController.confirmarAjuste);
inventarioRouter.put('/ajustes/:id/revertir', InventarioController.revertirAjuste);

// Lotes y Vencimientos
inventarioRouter.get('/lotes', InventarioController.listLotes);
inventarioRouter.get('/lotes/por-vencer', InventarioController.getLotesPorVencer);

