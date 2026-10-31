import { IInventarioRepository } from '../../../domain/repositories/inventario.repository.interface.js';

export class ConfirmarAjusteUseCase {
  constructor(private readonly inventarioRepo: IInventarioRepository) { }

  public async execute(schemaName: string, ajusteId: string, aprobadoPor: string): Promise<void> {
    if (!ajusteId) throw new Error('El ID del ajuste es obligatorio.');
    if (!aprobadoPor) throw new Error('El usuario que aprueba es obligatorio.');

    await this.inventarioRepo.confirmarAjuste(schemaName, ajusteId, aprobadoPor);
  }
}

