import { IStorageService } from '../../../domain/services/storage.service.interface.js';
import { IFileRepository } from '../../../domain/repositories/file.repository.interface.js';
import { ITenantRepository } from '../../../domain/repositories/tenant.repository.interface.js';
import { StorageFileNotFoundError } from '../../../core/errors/storage-errors.js';
import { logger } from '../../../core/logger/logger.js';

export interface DeleteFileDTO {
  tenantId: string;
  schemaName: string;
  fileId: string;
}

export class DeleteFileUseCase {
  constructor(
    private readonly storageService: IStorageService,
    private readonly fileRepository: IFileRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  public async execute(dto: DeleteFileDTO): Promise<void> {
    const file = await this.fileRepository.findById(dto.schemaName, dto.fileId);
    if (!file || file.status === 'DELETED') {
      throw new StorageFileNotFoundError(dto.fileId);
    }

    // 1. Eliminar objeto físico del bucket S3 / MinIO
    try {
      await this.storageService.delete(file.storedKey);
    } catch (err) {
      logger.warn({ err, key: file.storedKey }, 'Advertencia: No se pudo eliminar el objeto del bucket');
    }

    // 2. Marcar como eliminado en la base de datos del tenant (soft-delete para auditoría)
    await this.fileRepository.delete(dto.schemaName, dto.fileId);

    // 3. Reajustar cuota consumida del tenant
    const tenant = await this.tenantRepository.findById(dto.tenantId);
    if (tenant) {
      tenant.reduceStorageUsage(file.sizeBytes);
      await this.tenantRepository.update(tenant);
    }

    logger.info({ tenantId: dto.tenantId, fileId: dto.fileId, key: file.storedKey }, 'Archivo eliminado exitosamente');
  }
}
