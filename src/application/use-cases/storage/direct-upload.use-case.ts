import { v4 as uuidv4 } from 'uuid';
import { IStorageService } from '../../../domain/services/storage.service.interface.js';
import { IFileRepository } from '../../../domain/repositories/file.repository.interface.js';
import { ITenantRepository } from '../../../domain/repositories/tenant.repository.interface.js';
import { StorageFile, FileCategory } from '../../../domain/entities/storage-file.entity.js';
import { TenantNotFoundError, TenantQuotaExceededError } from '../../../core/errors/tenant-errors.js';
import { FileTooLargeError } from '../../../core/errors/storage-errors.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../core/logger/logger.js';

export interface DirectUploadDTO {
  tenantId: string;
  schemaName: string;
  originalName: string;
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  category: FileCategory;
  metadata?: Record<string, unknown>;
  userId?: string;
}

export class DirectUploadUseCase {
  constructor(
    private readonly storageService: IStorageService,
    private readonly fileRepository: IFileRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  public async execute(dto: DirectUploadDTO): Promise<StorageFile> {
    if (dto.sizeBytes > env.MAX_FILE_SIZE_BYTES) {
      throw new FileTooLargeError(env.MAX_FILE_SIZE_BYTES);
    }

    const tenant = await this.tenantRepository.findById(dto.tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(dto.tenantId);
    }

    if (!tenant.hasAvailableQuota(dto.sizeBytes)) {
      throw new TenantQuotaExceededError(tenant.storageUsedBytes + dto.sizeBytes, tenant.storageQuotaBytes);
    }

    // 1. Clave aislada
    const storedKey = this.storageService.buildTenantKey(dto.tenantId, dto.category, dto.originalName);

    // 2. Subir directamente al bucket S3 / MinIO
    const uploadResult = await this.storageService.upload({
      key: storedKey,
      body: dto.buffer,
      contentType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
    });

    // 3. Registrar directamente como ACTIVE
    const fileId = uuidv4();
    const file = new StorageFile({
      id: fileId,
      tenantId: dto.tenantId,
      originalName: dto.originalName,
      storedKey,
      bucketName: uploadResult.bucket,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      category: dto.category,
      checksumSha256: uploadResult.etag?.replace(/"/g, ''),
      status: 'ACTIVE',
      metadata: dto.metadata,
      uploadedByUserId: dto.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.fileRepository.create(dto.schemaName, file);

    // 4. Actualizar consumo de cuota
    tenant.addStorageUsage(dto.sizeBytes);
    await this.tenantRepository.update(tenant);

    logger.info(
      { tenantId: dto.tenantId, fileId: file.id, key: storedKey, bytes: dto.sizeBytes },
      'Archivo subido directamente y registrado con éxito'
    );

    return file;
  }
}
