import { ICatalogoRepository } from '../../../domain/repositories/pos.repository.interface.js';
import { Categoria, Producto } from '../../../domain/entities/catalogo.entity.js';

export class GetCatalogoUseCase {
  constructor(private readonly catalogoRepo: ICatalogoRepository) {}

  public async execute(
    schemaName: string,
    params?: { categoriaId?: string; search?: string; barcode?: string }
  ): Promise<{ categorias: Categoria[]; productos: Producto[] }> {
    const categorias = await this.catalogoRepo.listCategorias(schemaName);

    if (params?.barcode) {
      const p = await this.catalogoRepo.getProductoByBarcode(schemaName, params.barcode);
      return {
        categorias,
        productos: p ? [p] : [],
      };
    }

    const productos = await this.catalogoRepo.listProductos(schemaName, params?.categoriaId, params?.search);

    return {
      categorias,
      productos,
    };
  }
}
