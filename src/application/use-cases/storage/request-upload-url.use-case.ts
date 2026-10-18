import { v4 as uuidv4 } from 'uuid';
import { IStorageService } from '../../../domain/services/storage.service.interface.js';
import { IFileRepository } from '../../../domain/repositories/file.repository.interface.js';
import { ITenantRepository } from '../../../domain/repositories/tenant.repository.interface.js';
import { StorageFile, FileCategory } from '../../../domain/entities/storage-file.entity.js';
import { TenantNotFoundError, TenantQuotaExceededError } from '../../../core/errors/tenant-errors.js';
import { FileTooLargeError } from '../../../core/errors/storage-errors.js';
import { env } from '../../../config/env.js';

export interface RequestUploadUrlDTO {
  tenantId: string;
  schemaName: string;
  originalName: string;
  mimeType: string;
  estimatedSizeBytes: number;
  category: FileCategory;
  metadata?: Record<string, unknown>;
  userId?: string;
}

export interface RequestUploadUrlResult {
  fileId: string;
  uploadUrl: string;
  storedKey: string;
  bucketName: string;
  expiresInSeconds: number;
}

export class RequestUploadUrlUseCase {
  constructor(
    private readonly storageService: IStorageService,
    private readonly fileRepository: IFileRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  public async execute(dto: RequestUploadUrlDTO): Promise<RequestUploadUrlResult> {
    // 1. Validar límite individual de archivo
    if (dto.estimatedSizeBytes > env.MAX_FILE_SIZE_BYTES) {
      throw new FileTooLargeError(env.MAX_FILE_SIZE_BYTES);
    }

    // 2. Validar cuota disponible del tenant
    const tenant = await this.tenantRepository.findById(dto.tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(dto.tenantId);
    }

    if (!tenant.hasAvailableQuota(dto.estimatedSizeBytes)) {
      throw new TenantQuotaExceededError(tenant.storageUsedBytes + dto.estimatedSizeBytes, tenant.storageQuotaBytes);
    }

    // 3. Generar clave aislada por tenant en el bucket
    const storedKey = this.storageService.buildTenantKey(dto.tenantId, dto.category, dto.originalName);

    // 4. Generar URL pre-firmada de subida (S3/MinIO)
    const presigned = await this.storageService.generatePresignedUploadUrl({
      key: storedKey,
      contentType: dto.mimeType,
      expiresInSeconds: env.PRESIGNED_URL_EXPIRES_SECONDS,
    });

    // 5. Registrar archivo en estado PENDING_UPLOAD dentro del esquema aislado del cliente
    const fileId = uuidv4();
    const file = new StorageFile({
      id: fileId,
      tenantId: dto.tenantId,
      originalName: dto.originalName,
      storedKey,
      bucketName: presigned.bucket,
      mimeType: dto.mimeType,
      sizeBytes: dto.estimatedSizeBytes,
      category: dto.category,
      status: 'PENDING_UPLOAD',
      metadata: dto.metadata,
      uploadedByUserId: dto.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.fileRepository.create(dto.schemaName, file);

    return {
      fileId,
      uploadUrl: presigned.uploadUrl,
      storedKey,
      bucketName: presigned.bucket,
      expiresInSeconds: presigned.expiresInSeconds,
    };
  }
}
