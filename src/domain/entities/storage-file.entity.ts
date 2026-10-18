export type FileCategory =
  | 'facturacion'
  | 'comprobantes'
  | 'reportes'
  | 'nomina'
  | 'certificados'
  | 'medios_magneticos'
  | 'general';

export type FileStatus = 'PENDING_UPLOAD' | 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export interface StorageFileProps {
  id: string;
  tenantId: string;
  originalName: string;
  storedKey: string;
  bucketName: string;
  mimeType: string;
  sizeBytes: number;
  category: FileCategory;
  checksumSha256?: string;
  status: FileStatus;
  metadata?: Record<string, unknown>;
  uploadedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class StorageFile {
  public readonly id: string;
  public readonly tenantId: string;
  public readonly originalName: string;
  public readonly storedKey: string;
  public readonly bucketName: string;
  public readonly mimeType: string;
  public sizeBytes: number;
  public readonly category: FileCategory;
  public checksumSha256?: string;
  public status: FileStatus;
  public metadata: Record<string, unknown>;
  public readonly uploadedByUserId?: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: StorageFileProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.originalName = props.originalName;
    this.storedKey = props.storedKey;
    this.bucketName = props.bucketName;
    this.mimeType = props.mimeType;
    this.sizeBytes = props.sizeBytes;
    this.category = props.category;
    this.checksumSha256 = props.checksumSha256;
    this.status = props.status;
    this.metadata = props.metadata || {};
    this.uploadedByUserId = props.uploadedByUserId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public markAsActive(actualSizeBytes?: number, checksum?: string): void {
    this.status = 'ACTIVE';
    if (actualSizeBytes !== undefined) {
      this.sizeBytes = actualSizeBytes;
    }
    if (checksum) {
      this.checksumSha256 = checksum;
    }
    this.updatedAt = new Date();
  }

  public markAsDeleted(): void {
    this.status = 'DELETED';
    this.updatedAt = new Date();
  }
}
