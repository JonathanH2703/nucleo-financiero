import { Router } from 'express';
import { SucursalesController } from '../controllers/sucursales.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const sucursalesRouter = Router();

sucursalesRouter.use(tenantResolverMiddleware);

// Sucursales
sucursalesRouter.get('/', SucursalesController.listSucursales);
sucursalesRouter.post('/', SucursalesController.createSucursal);
sucursalesRouter.put('/:id', SucursalesController.updateSucursal);
sucursalesRouter.delete('/:id', SucursalesController.deleteSucursal);

// Bodegas
sucursalesRouter.get('/bodegas/todas', SucursalesController.listBodegas);
sucursalesRouter.post('/bodegas', SucursalesController.createBodega);
sucursalesRouter.put('/bodegas/:id', SucursalesController.updateBodega);
sucursalesRouter.delete('/bodegas/:id', SucursalesController.deleteBodega);

