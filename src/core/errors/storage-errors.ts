import { AppError } from './app-error.js';

export class StorageFileNotFoundError extends AppError {
  constructor(fileId: string) {
    super(`El archivo con identificador "${fileId}" no existe en el almacenamiento.`, 404, 'STORAGE_FILE_NOT_FOUND');
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxSizeBytes: number) {
    const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    super(
      `El tamaño del archivo excede el límite máximo permitido de ${maxMB} MB.`,
      413,
      'FILE_TOO_LARGE'
    );
  }
}

export class InvalidFileTypeError extends AppError {
  constructor(mimeType: string, allowedTypes?: string[]) {
    super(
      `El tipo de archivo "${mimeType}" no está permitido.${allowedTypes ? ` Tipos permitidos: ${allowedTypes.join(', ')}` : ''}`,
      415,
      'INVALID_FILE_TYPE'
    );
  }
}

export class StorageProviderError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, 'STORAGE_PROVIDER_ERROR', details);
  }
}
