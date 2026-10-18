import { Router } from 'express';
import multer from 'multer';
import { StorageController } from '../controllers/storage.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';
import { env } from '../../../config/env.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
  },
});

export const storageRouter = Router();

// Todas las rutas de almacenamiento requieren contexto de tenant identificado
storageRouter.use(tenantResolverMiddleware);

// Subida mediante Presigned URL directa al Bucket (Recomendada para archivos pesados)
storageRouter.post('/upload-url', StorageController.requestUploadUrl);
storageRouter.post('/confirm-upload/:fileId', StorageController.confirmUpload);

// Subida directa vía Multipart/form-data al backend
storageRouter.post('/upload', upload.single('file'), StorageController.directUpload);

// Listado de archivos del tenant
storageRouter.get('/files', StorageController.listFiles);

// Descarga segura con Presigned URL
storageRouter.get('/download/:fileId', StorageController.getDownloadUrl);

// Eliminación y liberación de cuota
storageRouter.delete('/files/:fileId', StorageController.deleteFile);
