import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const authRouter = Router();

// Todas las rutas de autenticación y gestión de roles se ejecutan en el contexto del tenant
authRouter.use(tenantResolverMiddleware);

// Autenticación rápida táctil y por credenciales
authRouter.post('/login-pin', AuthController.loginPin);
authRouter.post('/login-email', AuthController.loginEmail);

// Catálogo de permisos del sistema (agrupados por módulos)
authRouter.get('/permisos', AuthController.listPermisos);

// Gestión y personalización completa de roles
authRouter.get('/roles', AuthController.listRoles);
authRouter.post('/roles', AuthController.createRol);
authRouter.put('/roles/:rolId', AuthController.updateRol);
authRouter.delete('/roles/:rolId', AuthController.deleteRol);

// Directorio de usuarios y colaboradores
authRouter.get('/usuarios', AuthController.listUsuarios);
