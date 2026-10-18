import { Readable } from 'node:stream';

export interface UploadFileParams {
  key: string;
  body: Buffer | Uint8Array | Readable;
  contentType: string;
  sizeBytes?: number;
  metadata?: Record<string, string>;
}

export interface UploadFileResult {
  key: string;
  bucket: string;
  etag?: string;
  sizeBytes: number;
}

export interface PresignedUploadParams {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
  maxSizeBytes?: number;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  bucket: string;
  expiresInSeconds: number;
}

export interface PresignedDownloadParams {
  key: string;
  expiresInSeconds?: number;
  filename?: string;
}

export interface FileMetadataResult {
  sizeBytes: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
}

export interface IStorageService {
  upload(params: UploadFileParams): Promise<UploadFileResult>;
  generatePresignedUploadUrl(params: PresignedUploadParams): Promise<PresignedUploadResult>;
  generatePresignedDownloadUrl(params: PresignedDownloadParams): Promise<string>;
  getFileStream(key: string): Promise<{ stream: Readable; contentType?: string; contentLength?: number }>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<FileMetadataResult>;
  buildTenantKey(tenantId: string, category: string, originalFilename: string): string;
}
