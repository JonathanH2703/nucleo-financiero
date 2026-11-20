export type TenantStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED';

export type TenantPlan = 'basico' | 'intermedio' | 'personalizado';

export const DEFAULT_PLAN_MODULES: Record<TenantPlan, string[]> = {
  basico: ['pos', 'inventario', 'ajustes'],
  intermedio: ['pos', 'inventario', 'facturacion', 'compras', 'empresas', 'reportes', 'ajustes'],
  personalizado: ['pos', 'inventario', 'ajustes'],
};

export interface TenantProps {
  id: string;
  name: string;
  slug: string;
  taxId: string; // NIT / RUC / RFC
  schemaName: string;
  status: TenantStatus;
  plan?: TenantPlan;
  modulosActivos?: string[];
  adminPin?: string;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Tenant {
  public readonly id: string;
  public name: string;
  public readonly slug: string;
  public taxId: string;
  public readonly schemaName: string;
  public status: TenantStatus;
  public plan: TenantPlan;
  public modulosActivos: string[];
  public adminPin: string;
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
    this.plan = props.plan || 'basico';
    this.modulosActivos = props.modulosActivos && props.modulosActivos.length > 0
      ? props.modulosActivos
      : [...DEFAULT_PLAN_MODULES[this.plan]];
    this.adminPin = props.adminPin || '123456';
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

  public isModuleActive(moduleId: string): boolean {
    return this.modulosActivos.includes(moduleId);
  }

  public setPlan(newPlan: TenantPlan): void {
    this.plan = newPlan;
    if (newPlan !== 'personalizado') {
      this.modulosActivos = [...DEFAULT_PLAN_MODULES[newPlan]];
    }
    this.updatedAt = new Date();
  }

  public setModulosActivos(modulos: string[]): void {
    this.modulosActivos = modulos;
    this.updatedAt = new Date();
  }

  public static sanitizeSchemaName(slugOrId: string): string {
    const clean = slugOrId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `tenant_${clean}`;
  }
}
