import { IFacturacionRepository } from '../../../domain/repositories/pos.repository.interface.js';
import { FacturaFiscal } from '../../../domain/entities/facturacion.entity.js';

export class ListFacturasUseCase {
  constructor(private readonly facturacionRepo: IFacturacionRepository) {}

  public async execute(schemaName: string, limit: number = 50): Promise<FacturaFiscal[]> {
    return await this.facturacionRepo.listFacturas(schemaName, limit);
  }
}
