import { v4 as uuidv4 } from 'uuid';
import { ICatalogoRepository } from '../../../domain/repositories/catalogo.repository.interface.js';
import { Producto, ProductoProps } from '../../../domain/entities/catalogo.entity.js';

export class CreateProductoUseCase {
  constructor(private readonly catalogoRepo: ICatalogoRepository) { }

  public async execute(schemaName: string, props: Omit<ProductoProps, 'id'> & { id?: string }): Promise<Producto> {
    if (!props.nombre || !props.nombre.trim()) {
      throw new Error('El nombre del producto es obligatorio.');
    }
    if (props.precioBase === undefined || props.precioBase < 0) {
      throw new Error('El precio base debe ser un valor numérico mayor o igual a cero.');
    }

    const producto = new Producto({
      ...props,
      id: props.id || `prod_${uuidv4().substring(0, 8)}`,
    });

    return this.catalogoRepo.createProducto(schemaName, producto);
  }
}

