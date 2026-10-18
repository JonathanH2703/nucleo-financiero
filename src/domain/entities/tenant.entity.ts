export type TenantStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED';

export interface TenantProps {
  id: string;
  name: string;
  slug: string;
  taxId: string; // NIT / RUC / RFC
  schemaName: string;
  status: TenantStatus;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Tenant {
  public readonly id: string;
  public readonly name: string;
  public readonly slug: string;
  public readonly taxId: string;
  public readonly schemaName: string;
  public status: TenantStatus;
  public storageQuotaBytes: number;
  public storageUsedBytes: number;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: TenantProps) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.taxId = props.taxId;
    this.schemaName = props.schemaName;
    this.status = props.status;
    this.storageQuotaBytes = props.storageQuotaBytes;
    this.storageUsedBytes = props.storageUsedBytes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public hasAvailableQuota(additionalBytes: number): boolean {
    return this.storageUsedBytes + additionalBytes <= this.storageQuotaBytes;
  }

  public addStorageUsage(bytes: number): void {
    this.storageUsedBytes += bytes;
    this.updatedAt = new Date();
  }

  public reduceStorageUsage(bytes: number): void {
    this.storageUsedBytes = Math.max(0, this.storageUsedBytes - bytes);
    this.updatedAt = new Date();
  }

  public static sanitizeSchemaName(slugOrId: string): string {
    const clean = slugOrId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `tenant_${clean}`;
  }
}
