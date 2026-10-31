import { ITerceroRepository } from '../../../domain/repositories/tercero.repository.interface.js';
import { Tercero } from '../../../domain/entities/tercero.entity.js';

export class ListTercerosUseCase {
  constructor(private readonly terceroRepo: ITerceroRepository) { }

  public async execute(
    schemaName: string,
    filters?: {
      tipo?: 'cliente' | 'proveedor' | 'ambos' | string;
      search?: string;
      activo?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ terceros: Tercero[]; total: number; page: number; totalPages: number }> {
    return this.terceroRepo.list(schemaName, filters);
  }
}

