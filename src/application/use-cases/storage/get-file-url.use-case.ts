import { IStorageService } from '../../../domain/services/storage.service.interface.js';
import { IFileRepository } from '../../../domain/repositories/file.repository.interface.js';
import { StorageFileNotFoundError } from '../../../core/errors/storage-errors.js';
import { env } from '../../../config/env.js';

export interface GetFileUrlDTO {
  schemaName: string;
  fileId: string;
  expiresInSeconds?: number;
  downloadAsFilename?: string;
}

export interface GetFileUrlResult {
  fileId: string;
  downloadUrl: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  expiresInSeconds: number;
}

export class GetFileUrlUseCase {
  constructor(
    private readonly storageService: IStorageService,
    private readonly fileRepository: IFileRepository
  ) {}

  public async execute(dto: GetFileUrlDTO): Promise<GetFileUrlResult> {
    const file = await this.fileRepository.findById(dto.schemaName, dto.fileId);
    if (!file || file.status === 'DELETED') {
      throw new StorageFileNotFoundError(dto.fileId);
    }

    const expiresIn = dto.expiresInSeconds || env.PRESIGNED_URL_EXPIRES_SECONDS;
    const downloadUrl = await this.storageService.generatePresignedDownloadUrl({
      key: file.storedKey,
      expiresInSeconds: expiresIn,
      filename: dto.downloadAsFilename || file.originalName,
    });

    return {
      fileId: file.id,
      downloadUrl,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      expiresInSeconds: expiresIn,
    };
  }
}
