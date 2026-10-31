import { v4 as uuidv4 } from 'uuid';
import { IInventarioRepository } from '../../../domain/repositories/inventario.repository.interface.js';
import { MovimientoInventario, MovimientoInventarioProps } from '../../../domain/entities/inventario.entity.js';

export class RegistrarMovimientoUseCase {
  constructor(private readonly inventarioRepo: IInventarioRepository) { }

  public async execute(
    schemaName: string,
    props: Omit<MovimientoInventarioProps, 'id' | 'saldoAnterior' | 'saldoNuevo'> & { id?: string }
  ): Promise<MovimientoInventario> {
    if (!props.productoId) throw new Error('El ID del producto es obligatorio.');
    if (!props.bodegaId) throw new Error('La bodega es obligatoria.');
    if (!props.cantidad || props.cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a cero.');
    }

    const mov = new MovimientoInventario({
      ...props,
      id: props.id || `mov_${uuidv4().substring(0, 10)}`,
      saldoAnterior: 0,
      saldoNuevo: 0,
    });

    return this.inventarioRepo.registrarMovimiento(schemaName, mov);
  }
}

