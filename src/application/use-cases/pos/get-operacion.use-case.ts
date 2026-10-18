import { IOperacionRepository } from '../../../domain/repositories/pos.repository.interface.js';
import { AreaOperativa, PuntoAtencion } from '../../../domain/entities/operacion.entity.js';

export class GetOperacionUseCase {
  constructor(private readonly operacionRepo: IOperacionRepository) {}

  public async execute(
    schemaName: string,
    areaId?: string
  ): Promise<{ areas: AreaOperativa[]; puntosAtencion: PuntoAtencion[] }> {
    const areas = await this.operacionRepo.listAreas(schemaName);
    const puntosAtencion = await this.operacionRepo.listPuntosAtencion(schemaName, areaId);

    return {
      areas,
      puntosAtencion,
    };
  }
}
