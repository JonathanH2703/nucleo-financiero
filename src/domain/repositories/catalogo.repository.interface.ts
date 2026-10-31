import { Categoria, CategoriaProps, Producto, ProductoProps } from '../entities/catalogo.entity.js';
import { ProductoVariante, ProductoVarianteProps } from '../entities/producto-variante.entity.js';
import { ListaPrecio, ListaPrecioProps, PrecioProducto } from '../entities/lista-precio.entity.js';
import { ProveedorProducto, ProveedorProductoProps } from '../entities/proveedor-producto.entity.js';

export interface ICatalogoRepository {
  // Categorías
  createCategoria(schemaName: string, categoria: Categoria): Promise<Categoria>;
  updateCategoria(schemaName: string, id: string, data: Partial<CategoriaProps>): Promise<Categoria>;
  deleteCategoria(schemaName: string, id: string): Promise<void>;
  listCategorias(schemaName: string): Promise<Categoria[]>;
  getCategoriaById(schemaName: string, id: string): Promise<Categoria | null>;

  // Productos
  createProducto(schemaName: string, producto: Producto): Promise<Producto>;
  updateProducto(schemaName: string, id: string, data: Partial<ProductoProps>): Promise<Producto>;
  deleteProducto(schemaName: string, id: string): Promise<void>; // soft delete
  listProductos(
    schemaName: string,
    filters?: {
      categoriaId?: string;
      search?: string;
      activo?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ productos: Producto[]; total: number; page: number; totalPages: number }>;
  getProductoById(schemaName: string, id: string): Promise<Producto | null>;
  getProductoByBarcode(schemaName: string, barcode: string): Promise<Producto | null>;

  // Variantes
  createVariante(schemaName: string, variante: ProductoVariante): Promise<ProductoVariante>;
  updateVariante(schemaName: string, id: string, data: Partial<ProductoVarianteProps>): Promise<ProductoVariante>;
  deleteVariante(schemaName: string, id: string): Promise<void>;
  listVariantesByProducto(schemaName: string, productoId: string): Promise<ProductoVariante[]>;
  getVarianteById(schemaName: string, id: string): Promise<ProductoVariante | null>;

  // Listas de Precios
  createListaPrecio(schemaName: string, lista: ListaPrecio): Promise<ListaPrecio>;
  updateListaPrecio(schemaName: string, id: string, data: Partial<ListaPrecioProps>): Promise<ListaPrecio>;
  listListasPrecios(schemaName: string): Promise<ListaPrecio[]>;
  setPrecioProducto(schemaName: string, precio: PrecioProducto): Promise<PrecioProducto>;
  getPreciosProducto(schemaName: string, productoId: string, listaPrecioId?: string): Promise<PrecioProducto[]>;

  // Proveedores de Producto (M:N)
  vincularProveedorProducto(schemaName: string, rel: ProveedorProducto): Promise<ProveedorProducto>;
  actualizarProveedorProducto(schemaName: string, id: string, data: Partial<ProveedorProductoProps>): Promise<ProveedorProducto>;
  desvincularProveedorProducto(schemaName: string, id: string): Promise<void>;
  listProveedoresDeProducto(schemaName: string, productoId: string): Promise<ProveedorProducto[]>;
  listProductosDeProveedor(schemaName: string, proveedorId: string): Promise<ProveedorProducto[]>;
}
