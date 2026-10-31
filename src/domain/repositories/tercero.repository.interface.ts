import { Tercero, TerceroProps } from '../entities/tercero.entity.js';

export interface ITerceroRepository {
  create(schemaName: string, tercero: Tercero): Promise<Tercero>;
  update(schemaName: string, id: string, data: Partial<TerceroProps>): Promise<Tercero>;
  delete(schemaName: string, id: string): Promise<void>; // Soft delete: activo = false
  getById(schemaName: string, id: string): Promise<Tercero | null>;
  getByDocumento(schemaName: string, numeroDocumento: string): Promise<Tercero | null>;
  list(
    schemaName: string,
    filters?: {
      tipo?: 'cliente' | 'proveedor' | 'ambos' | string;
      search?: string;
      activo?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ terceros: Tercero[]; total: number; page: number; totalPages: number }>;
}
