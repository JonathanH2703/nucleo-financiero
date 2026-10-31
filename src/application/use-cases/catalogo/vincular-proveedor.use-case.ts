import { v4 as uuidv4 } from 'uuid';
import { ICatalogoRepository } from '../../../domain/repositories/catalogo.repository.interface.js';
import { ProveedorProducto, ProveedorProductoProps } from '../../../domain/entities/proveedor-producto.entity.js';

export class VincularProveedorUseCase {
  constructor(private readonly catalogoRepo: ICatalogoRepository) { }

  public async execute(
    schemaName: string,
    props: Omit<ProveedorProductoProps, 'id'> & { id?: string }
  ): Promise<ProveedorProducto> {
    if (!props.proveedorId) throw new Error('El ID del proveedor es obligatorio.');
    if (!props.productoId) throw new Error('El ID del producto es obligatorio.');

    const rel = new ProveedorProducto({
      ...props,
      id: props.id || `prov_prod_${uuidv4().substring(0, 8)}`,
    });

    return this.catalogoRepo.vincularProveedorProducto(schemaName, rel);
  }
}

