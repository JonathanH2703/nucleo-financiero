import { ICatalogoRepository } from '../../../domain/repositories/catalogo.repository.interface.js';
import { Producto, ProductoProps } from '../../../domain/entities/catalogo.entity.js';

export class UpdateProductoUseCase {
  constructor(private readonly catalogoRepo: ICatalogoRepository) { }

  public async execute(schemaName: string, id: string, props: Partial<ProductoProps>): Promise<Producto> {
    if (!id) throw new Error('El ID del producto es obligatorio.');
    return this.catalogoRepo.updateProducto(schemaName, id, props);
  }
}

