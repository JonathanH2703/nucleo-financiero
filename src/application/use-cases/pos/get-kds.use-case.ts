import { IPosRepository } from '../../../domain/repositories/pos.repository.interface.js';
import { ItemComanda, EstadoPreparacionItem } from '../../../domain/entities/pos.entity.js';

export class GetKdsUseCase {
  constructor(private readonly posRepo: IPosRepository) {}

  public async getQueue(
    schemaName: string
  ): Promise<{ item: ItemComanda; comandaNumero: string; puntoAtencion?: string }[]> {
    return await this.posRepo.listKdsItems(schemaName);
  }

  public async updateItemStatus(
    schemaName: string,
    itemId: string,
    nuevoEstado: EstadoPreparacionItem
  ): Promise<void> {
    await this.posRepo.updateItemKdsEstado(schemaName, itemId, nuevoEstado);
  }
}
