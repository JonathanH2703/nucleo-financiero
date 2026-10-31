import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const authRouter = Router();

// ─── Rutas Públicas (No requieren contexto de tenant previo) ──────────
// Autenticación limpia unificada por NIT + PIN
authRouter.post('/login-nit-pin', AuthController.loginNitPin);

// Ingreso maestro exclusivo del Administrador del Sistema
authRouter.post('/login-admin-sistema', AuthController.loginAdminSistema);

// Compatibilidad
authRouter.post('/login-pin', AuthController.loginPin);
authRouter.post('/login-email', AuthController.loginEmail);

// ─── Rutas Protegidas en Contexto de Tenant ───────────────────────────
authRouter.use(tenantResolverMiddleware);

// Catálogo de permisos del sistema (agrupados por módulos)
authRouter.get('/permisos', AuthController.listPermisos);

// Gestión y personalización completa de roles
authRouter.get('/roles', AuthController.listRoles);
authRouter.post('/roles', AuthController.createRol);
authRouter.put('/roles/:rolId', AuthController.updateRol);
authRouter.delete('/roles/:rolId', AuthController.deleteRol);

// Directorio y creación de usuarios y colaboradores
authRouter.get('/usuarios', AuthController.listUsuarios);
authRouter.post('/usuarios', AuthController.createUsuario);
