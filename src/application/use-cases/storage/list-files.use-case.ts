import { IFileRepository, ListFilesFilters } from '../../../domain/repositories/file.repository.interface.js';
import { StorageFile } from '../../../domain/entities/storage-file.entity.js';

export interface ListFilesDTO {
  schemaName: string;
  filters?: ListFilesFilters;
}

export class ListFilesUseCase {
  constructor(private readonly fileRepository: IFileRepository) {}

  public async execute(dto: ListFilesDTO): Promise<{ files: StorageFile[]; total: number }> {
    return await this.fileRepository.list(dto.schemaName, dto.filters);
  }
}
