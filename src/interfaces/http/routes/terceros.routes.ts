import { Router } from 'express';
import { TercerosController } from '../controllers/terceros.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const tercerosRouter = Router();

// Todas las rutas requieren tenant resolver
tercerosRouter.use(tenantResolverMiddleware);

tercerosRouter.get('/', TercerosController.listTerceros);
tercerosRouter.post('/', TercerosController.createTercero);
