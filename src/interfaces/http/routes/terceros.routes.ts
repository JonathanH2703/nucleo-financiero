import { Router } from 'express';
import { TercerosController } from '../controllers/terceros.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const tercerosRouter = Router();

tercerosRouter.use(tenantResolverMiddleware);

tercerosRouter.get('/', TercerosController.listTerceros);
tercerosRouter.post('/', TercerosController.createTercero);
tercerosRouter.get('/:id', TercerosController.getTerceroById);
tercerosRouter.put('/:id', TercerosController.updateTercero);
tercerosRouter.delete('/:id', TercerosController.deleteTercero);
