import { Router } from 'express';
import { CatalogoController } from '../controllers/catalogo.controller.js';
import { tenantResolverMiddleware } from '../middlewares/tenant-resolver.middleware.js';

export const catalogoRouter = Router();

catalogoRouter.use(tenantResolverMiddleware);

// Categorías
catalogoRouter.get('/categorias', CatalogoController.listCategorias);
catalogoRouter.post('/categorias', CatalogoController.createCategoria);
catalogoRouter.put('/categorias/:id', CatalogoController.updateCategoria);
catalogoRouter.delete('/categorias/:id', CatalogoController.deleteCategoria);

// Productos
catalogoRouter.get('/productos', CatalogoController.listProductos);
catalogoRouter.post('/productos', CatalogoController.createProducto);
catalogoRouter.get('/productos/:id', CatalogoController.getProductoById);
catalogoRouter.put('/productos/:id', CatalogoController.updateProducto);
catalogoRouter.delete('/productos/:id', CatalogoController.deleteProducto);
catalogoRouter.get('/productos/barcode/:code', CatalogoController.getProductoByBarcode);

// Variantes
catalogoRouter.get('/productos/:productoId/variantes', CatalogoController.listVariantes);
catalogoRouter.post('/productos/:productoId/variantes', CatalogoController.createVariante);
catalogoRouter.put('/variantes/:id', CatalogoController.updateVariante);
catalogoRouter.delete('/variantes/:id', CatalogoController.deleteVariante);

// Listas de Precios
catalogoRouter.get('/listas-precios', CatalogoController.listListasPrecios);
catalogoRouter.post('/listas-precios', CatalogoController.createListaPrecio);
catalogoRouter.post('/precios', CatalogoController.setPrecioProducto);
catalogoRouter.get('/productos/:productoId/precios', CatalogoController.getPreciosProducto);

// Proveedor-Producto (M:N)
catalogoRouter.post('/proveedor-producto', CatalogoController.vincularProveedor);
catalogoRouter.delete('/proveedor-producto/:id', CatalogoController.desvincularProveedor);
catalogoRouter.get('/productos/:productoId/proveedores', CatalogoController.listProveedoresDeProducto);
catalogoRouter.get('/proveedores/:proveedorId/productos', CatalogoController.listProductosDeProveedor);

