import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextData {
  tenantId: string;
  schemaName: string;
  tenantSlug: string;
  tenantName: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContextData>();

export const TenantContext = {
  run<T>(data: TenantContextData, callback: () => T): T {
    return tenantStorage.run(data, callback);
  },

  get(): TenantContextData | undefined {
    return tenantStorage.getStore();
  },

  getRequired(): TenantContextData {
    const store = tenantStorage.getStore();
    if (!store) {
      throw new Error('TenantContext no inicializado en el contexto de ejecución actual');
    }
    return store;
  },

  getTenantId(): string {
    return this.getRequired().tenantId;
  },

  getSchemaName(): string {
    return this.getRequired().schemaName;
  },
};
