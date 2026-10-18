import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { S3StorageService } from '../../../infrastructure/storage/s3-storage.service.js';
import { PostgresFileRepository } from '../../../infrastructure/repositories/postgres-file.repository.js';
import { PostgresTenantRepository } from '../../../infrastructure/repositories/postgres-tenant.repository.js';
import { TenantContext } from '../../../core/context/tenant-context.js';
import { RequestUploadUrlUseCase } from '../../../application/use-cases/storage/request-upload-url.use-case.js';
import { ConfirmUploadUseCase } from '../../../application/use-cases/storage/confirm-upload.use-case.js';
import { DirectUploadUseCase } from '../../../application/use-cases/storage/direct-upload.use-case.js';
import { GetFileUrlUseCase } from '../../../application/use-cases/storage/get-file-url.use-case.js';
import { ListFilesUseCase } from '../../../application/use-cases/storage/list-files.use-case.js';
import { DeleteFileUseCase } from '../../../application/use-cases/storage/delete-file.use-case.js';
import { FileCategory } from '../../../domain/entities/storage-file.entity.js';
import { AppError } from '../../../core/errors/app-error.js';

const storageService = new S3StorageService();
const fileRepository = new PostgresFileRepository();
const tenantRepository = new PostgresTenantRepository();

const requestUploadUrlUseCase = new RequestUploadUrlUseCase(storageService, fileRepository, tenantRepository);
const confirmUploadUseCase = new ConfirmUploadUseCase(storageService, fileRepository, tenantRepository);
const directUploadUseCase = new DirectUploadUseCase(storageService, fileRepository, tenantRepository);
const getFileUrlUseCase = new GetFileUrlUseCase(storageService, fileRepository);
const listFilesUseCase = new ListFilesUseCase(fileRepository);
const deleteFileUseCase = new DeleteFileUseCase(storageService, fileRepository, tenantRepository);

const categoryEnum = z.enum([
  'facturacion',
  'comprobantes',
  'reportes',
  'nomina',
  'certificados',
  'medios_magneticos',
  'general',
]);

const requestUploadSchema = z.object({
  originalName: z.string().min(1, 'El nombre original del archivo es requerido'),
  mimeType: z.string().min(1, 'El tipo MIME es requerido'),
  estimatedSizeBytes: z.number().positive('El tamaño estimado debe ser positivo'),
  category: categoryEnum.default('general'),
  metadata: z.record(z.unknown()).optional(),
});

export class StorageController {
  /**
   * Genera Presigned URL para subida directa al bucket (MinIO/S3)
   */
  public static async requestUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = TenantContext.getRequired();
      const validated = requestUploadSchema.parse(req.body);

      const result = await requestUploadUrlUseCase.execute({
        tenantId: tenantCtx.tenantId,
        schemaName: tenantCtx.schemaName,
        originalName: validated.originalName,
        mimeType: validated.mimeType,
        estimatedSizeBytes: validated.estimatedSizeBytes,
        category: validated.category as FileCategory,
        metadata: validated.metadata,
        userId: (req.headers['x-user-id'] as string) || undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirma la subida después de que el cliente sube el archivo con el presigned URL
   */
  public static async confirmUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = TenantContext.getRequired();
      const fileId = req.params.fileId as string;

      const file = await confirmUploadUseCase.execute({
        tenantId: tenantCtx.tenantId,
        schemaName: tenantCtx.schemaName,
        fileId,
      });

      res.status(200).json({
        success: true,
        message: 'Archivo verificado y activado en el almacenamiento contable',
        data: file,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Subida directa multipart a través de la API (para ficheros pequeños o llamadas de backend a backend)
   */
  public static async directUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = TenantContext.getRequired();
      const file = req.file;

      if (!file) {
        throw new AppError('No se proporcionó ningún archivo en el formulario (multipart)', 400, 'FILE_MISSING');
      }

      const category = (req.body.category as FileCategory) || 'general';

      const savedFile = await directUploadUseCase.execute({
        tenantId: tenantCtx.tenantId,
        schemaName: tenantCtx.schemaName,
        originalName: file.originalname,
        buffer: file.buffer,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        category,
        userId: (req.headers['x-user-id'] as string) || undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Archivo cargado exitosamente',
        data: savedFile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene una URL firmada de descarga temporal para un archivo
   */
  public static async getDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = TenantContext.getRequired();
      const fileId = req.params.fileId as string;
      const expiresIn = req.query.expiresIn ? Number(req.query.expiresIn) : undefined;
      const filename = (req.query.filename as string) || undefined;

      const result = await getFileUrlUseCase.execute({
        schemaName: tenantCtx.schemaName,
        fileId,
        expiresInSeconds: expiresIn,
        downloadAsFilename: filename,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lista los archivos del tenant activo con filtros
   */
  public static async listFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = TenantContext.getRequired();
      const category = (req.query.category as FileCategory) || undefined;
      const status = (req.query.status as string) || undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const result = await listFilesUseCase.execute({
        schemaName: tenantCtx.schemaName,
        filters: { category, status, limit, offset },
      });

      res.status(200).json({
        success: true,
        tenant: {
          id: tenantCtx.tenantId,
          name: tenantCtx.tenantName,
          slug: tenantCtx.tenantSlug,
        },
        pagination: {
          total: result.total,
          limit,
          offset,
        },
        data: result.files,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un archivo del bucket y de la base de datos
   */
  public static async deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = TenantContext.getRequired();
      const fileId = req.params.fileId as string;

      await deleteFileUseCase.execute({
        tenantId: tenantCtx.tenantId,
        schemaName: tenantCtx.schemaName,
        fileId,
      });

      res.status(200).json({
        success: true,
        message: 'Archivo eliminado del bucket y cuota reajustada',
      });
    } catch (error) {
      next(error);
    }
  }
}
