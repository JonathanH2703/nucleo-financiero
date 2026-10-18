import { IStorageService } from '../../../domain/services/storage.service.interface.js';
import { IFileRepository } from '../../../domain/repositories/file.repository.interface.js';
import { ITenantRepository } from '../../../domain/repositories/tenant.repository.interface.js';
import { StorageFile } from '../../../domain/entities/storage-file.entity.js';
import { StorageFileNotFoundError, StorageProviderError } from '../../../core/errors/storage-errors.js';
import { logger } from '../../../core/logger/logger.js';

export interface ConfirmUploadDTO {
  tenantId: string;
  schemaName: string;
  fileId: string;
}

export class ConfirmUploadUseCase {
  constructor(
    private readonly storageService: IStorageService,
    private readonly fileRepository: IFileRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  public async execute(dto: ConfirmUploadDTO): Promise<StorageFile> {
    const file = await this.fileRepository.findById(dto.schemaName, dto.fileId);
    if (!file) {
      throw new StorageFileNotFoundError(dto.fileId);
    }

    if (file.status === 'ACTIVE') {
      return file;
    }

    // 1. Verificar existencia física y tamaño real en el bucket
    const metadata = await this.storageService.getMetadata(file.storedKey);
    if (!metadata) {
      throw new StorageProviderError('El archivo no fue encontrado en el bucket de almacenamiento.');
    }

    // 2. Marcar como activo en el esquema del cliente
    const actualBytes = metadata.sizeBytes;
    file.markAsActive(actualBytes, metadata.etag);
    await this.fileRepository.update(dto.schemaName, file);

    // 3. Actualizar consumo de cuota del tenant
    const tenant = await this.tenantRepository.findById(dto.tenantId);
    if (tenant) {
      tenant.addStorageUsage(actualBytes);
      await this.tenantRepository.update(tenant);
    }

    logger.info(
      { tenantId: dto.tenantId, fileId: file.id, key: file.storedKey, sizeBytes: actualBytes },
      'Carga de archivo confirmada y activada exitosamente'
    );

    return file;
  }
}
