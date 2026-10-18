import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';
import { logger } from '../../core/logger/logger.js';
import { StorageProviderError, StorageFileNotFoundError } from '../../core/errors/storage-errors.js';
import {
  IStorageService,
  UploadFileParams,
  UploadFileResult,
  PresignedUploadParams,
  PresignedUploadResult,
  PresignedDownloadParams,
  FileMetadataResult,
} from '../../domain/services/storage.service.interface.js';

export class S3StorageService implements IStorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = env.STORAGE_BUCKET_NAME;

    const s3Config: ConstructorParameters<typeof S3Client>[0] = {
      region: env.STORAGE_REGION,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      },
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    };

    if (env.STORAGE_ENDPOINT) {
      s3Config.endpoint = env.STORAGE_ENDPOINT;
    }

    this.client = new S3Client(s3Config);
    logger.info(
      { provider: env.STORAGE_PROVIDER, bucket: this.bucketName, endpoint: env.STORAGE_ENDPOINT || 'AWS_DEFAULT' },
      'S3StorageService inicializado correctamente'
    );
  }

  public async upload(params: UploadFileParams): Promise<UploadFileResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        Metadata: params.metadata,
      });

      const response = await this.client.send(command);

      return {
        key: params.key,
        bucket: this.bucketName,
        etag: response.ETag,
        sizeBytes: params.sizeBytes ?? 0,
      };
    } catch (error) {
      logger.error({ error, key: params.key }, 'Error al subir archivo a bucket');
      throw new StorageProviderError('Error al cargar archivo en el bucket de almacenamiento', error);
    }
  }

  public async generatePresignedUploadUrl(params: PresignedUploadParams): Promise<PresignedUploadResult> {
    try {
      const expiresIn = params.expiresInSeconds || env.PRESIGNED_URL_EXPIRES_SECONDS;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: params.key,
        ContentType: params.contentType,
      });

      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

      return {
        uploadUrl,
        key: params.key,
        bucket: this.bucketName,
        expiresInSeconds: expiresIn,
      };
    } catch (error) {
      logger.error({ error, key: params.key }, 'Error al generar Presigned Upload URL');
      throw new StorageProviderError('No fue posible generar la URL firmada de subida', error);
    }
  }

  public async generatePresignedDownloadUrl(params: PresignedDownloadParams): Promise<string> {
    try {
      const expiresIn = params.expiresInSeconds || env.PRESIGNED_URL_EXPIRES_SECONDS;

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: params.key,
        ResponseContentDisposition: params.filename
          ? `attachment; filename="${encodeURIComponent(params.filename)}"`
          : undefined,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      logger.error({ error, key: params.key }, 'Error al generar Presigned Download URL');
      throw new StorageProviderError('No fue posible generar la URL firmada de descarga', error);
    }
  }

  public async getFileStream(key: string): Promise<{ stream: Readable; contentType?: string; contentLength?: number }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new StorageFileNotFoundError(key);
      }

      return {
        stream: response.Body as Readable,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new StorageFileNotFoundError(key);
      }
      logger.error({ error, key }, 'Error al obtener stream del archivo');
      throw new StorageProviderError('Error al recuperar stream de archivo del almacenamiento', error);
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      logger.error({ error, key }, 'Error al eliminar objeto del bucket');
      throw new StorageProviderError('Error al eliminar archivo del bucket', error);
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw new StorageProviderError('Error al verificar existencia de archivo', error);
    }
  }

  public async getMetadata(key: string): Promise<FileMetadataResult> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        sizeBytes: response.ContentLength || 0,
        contentType: response.ContentType,
        etag: response.ETag,
        lastModified: response.LastModified,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw new StorageFileNotFoundError(key);
      }
      throw new StorageProviderError('Error al consultar metadatos del archivo', error);
    }
  }

  public buildTenantKey(tenantId: string, category: string, originalFilename: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uniqueId = uuidv4();
    const cleanFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Aislamiento jerárquico por tenant: tenants/{tenant_id}/{categoria}/{yyyy}/{mm}/{uuid}_{nombre}
    return `tenants/${tenantId}/${category}/${year}/${month}/${uniqueId}_${cleanFilename}`;
  }
}
