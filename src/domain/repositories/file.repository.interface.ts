import { StorageFile, FileCategory } from '../entities/storage-file.entity.js';

export interface ListFilesFilters {
  category?: FileCategory;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface IFileRepository {
  findById(schemaName: string, id: string): Promise<StorageFile | null>;
  findByKey(schemaName: string, key: string): Promise<StorageFile | null>;
  create(schemaName: string, file: StorageFile): Promise<StorageFile>;
  update(schemaName: string, file: StorageFile): Promise<StorageFile>;
  list(schemaName: string, filters?: ListFilesFilters): Promise<{ files: StorageFile[]; total: number }>;
  delete(schemaName: string, id: string): Promise<void>;
  calculateTotalUsageBytes(schemaName: string): Promise<number>;
}
