import { v4 as uuidv4 } from 'uuid';
import { ITerceroRepository } from '../../../domain/repositories/tercero.repository.interface.js';
import { Tercero, TerceroProps } from '../../../domain/entities/tercero.entity.js';

export class SaveTerceroUseCase {
  constructor(private readonly terceroRepo: ITerceroRepository) { }

  public async execute(schemaName: string, props: Omit<TerceroProps, 'id'> & { id?: string }): Promise<Tercero> {
    if (!props.numeroDocumento || !props.numeroDocumento.trim()) {
      throw new Error('El número de documento o NIT es obligatorio.');
    }
    if (!props.razonSocial || !props.razonSocial.trim()) {
      throw new Error('La razón social o nombre es obligatorio.');
    }

    const id = props.id || uuidv4();
    const tercero = new Tercero({
      ...props,
      id,
    });

    return this.terceroRepo.create(schemaName, tercero);
  }
}

