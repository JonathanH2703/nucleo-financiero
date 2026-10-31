import { IInventarioRepository } from '../../../domain/repositories/inventario.repository.interface.js';
import { MovimientoInventario } from '../../../domain/entities/inventario.entity.js';

export class GetKardexUseCase {
  constructor(private readonly inventarioRepo: IInventarioRepository) { }

  public async execute(
    schemaName: string,
    filters: {
      productoId?: string;
      varianteId?: string;
      bodegaId?: string;
      tipo?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ movimientos: MovimientoInventario[]; total: number; page: number; totalPages: number }> {
    return this.inventarioRepo.getKardex(schemaName, filters);
  }
}

