import { Request, Response, NextFunction } from 'express';
import { PostgresCatalogoRepository } from '../../../infrastructure/repositories/postgres-catalogo.repository.js';
import { PostgresInventarioRepository } from '../../../infrastructure/repositories/postgres-inventario.repository.js';
import { PostgresBodegaRepository } from '../../../infrastructure/repositories/postgres-bodega.repository.js';
import { MovimientoInventario } from '../../../domain/entities/inventario.entity.js';
import { CreateProductoUseCase } from '../../../application/use-cases/catalogo/create-producto.use-case.js';
import { UpdateProductoUseCase } from '../../../application/use-cases/catalogo/update-producto.use-case.js';
import { CreateCategoriaUseCase } from '../../../application/use-cases/catalogo/create-categoria.use-case.js';
import { CreateVarianteUseCase } from '../../../application/use-cases/catalogo/create-variante.use-case.js';
import { VincularProveedorUseCase } from '../../../application/use-cases/catalogo/vincular-proveedor.use-case.js';
import { ListaPrecio, PrecioProducto } from '../../../domain/entities/lista-precio.entity.js';
import { v4 as uuidv4 } from 'uuid';

const catalogoRepo = new PostgresCatalogoRepository();
const inventarioRepo = new PostgresInventarioRepository();
const bodegaRepo = new PostgresBodegaRepository();
const createProductoUseCase = new CreateProductoUseCase(catalogoRepo);
const updateProductoUseCase = new UpdateProductoUseCase(catalogoRepo);
const createCategoriaUseCase = new CreateCategoriaUseCase(catalogoRepo);
const createVarianteUseCase = new CreateVarianteUseCase(catalogoRepo);
const vincularProveedorUseCase = new VincularProveedorUseCase(catalogoRepo);

export class CatalogoController {
  // ================= CATEGORÍAS =================
  public static async listCategorias(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const categorias = await catalogoRepo.listCategorias(tenant.schemaName);
      res.status(200).json({ success: true, count: categorias.length, data: categorias });
    } catch (err) {
      next(err);
    }
  }

  public static async createCategoria(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const categoria = await createCategoriaUseCase.execute(tenant.schemaName, req.body);
      res.status(201).json({ success: true, message: 'Categoría creada exitosamente', data: categoria });
    } catch (err) {
      next(err);
    }
  }

  public static async updateCategoria(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const categoria = await catalogoRepo.updateCategoria(tenant.schemaName, id, req.body);
      res.status(200).json({ success: true, message: 'Categoría actualizada exitosamente', data: categoria });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteCategoria(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      await catalogoRepo.deleteCategoria(tenant.schemaName, id);
      res.status(200).json({ success: true, message: 'Categoría eliminada exitosamente' });
    } catch (err) {
      next(err);
    }
  }

  // ================= PRODUCTOS =================
  public static async listProductos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { categoriaId, search, activo, page, limit } = req.query;

      const result = await catalogoRepo.listProductos(tenant.schemaName, {
        categoriaId: categoriaId as string,
        search: search as string,
        activo: activo !== undefined ? activo === 'true' : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });

      res.status(200).json({
        success: true,
        count: result.productos.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        data: result.productos,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getProductoById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const producto = await catalogoRepo.getProductoById(tenant.schemaName, id);
      if (!producto) {
        res.status(404).json({ success: false, message: 'Producto no encontrado' });
        return;
      }
      res.status(200).json({ success: true, data: producto });
    } catch (err) {
      next(err);
    }
  }

  public static async getProductoByBarcode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const code = String(req.params.code);
      const producto = await catalogoRepo.getProductoByBarcode(tenant.schemaName, code);
      if (!producto) {
        res.status(404).json({ success: false, message: 'Producto no encontrado por código de barras o SKU' });
        return;
      }
      res.status(200).json({ success: true, data: producto });
    } catch (err) {
      next(err);
    }
  }

  public static async createProducto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const stockInicial = Number(req.body.stockInicial || 0);
      const producto = await createProductoUseCase.execute(tenant.schemaName, req.body);

      // Si tiene stock inicial físico (> 0), asentar en stock_bodegas y Kardex para mantener consistencia multi-bodega
      if (!producto.esServicio && stockInicial > 0) {
        let bodegaId = req.body.bodegaId as string | undefined;
        if (!bodegaId) {
          const bodegas = await bodegaRepo.listBodegas(tenant.schemaName);
          bodegaId = bodegas[0]?.id;
        }
        if (bodegaId) {
          await inventarioRepo.registrarMovimiento(
            tenant.schemaName,
            new MovimientoInventario({
              id: `mov_${uuidv4().substring(0, 10)}`,
              productoId: producto.id,
              bodegaId,
              tipo: 'ENTRADA',
              cantidad: stockInicial,
              costoUnitario: producto.costo || 0,
              saldoAnterior: 0,
              saldoNuevo: stockInicial,
              referenciaDocumento: producto.sku || producto.id,
              referenciaTipo: 'INVENTARIO_INICIAL',
              notas: 'Stock inicial al registrar producto',
            })
          );
        }
      }

      res.status(201).json({ success: true, message: 'Producto creado exitosamente', data: producto });
    } catch (err) {
      next(err);
    }
  }

  public static async updateProducto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const producto = await updateProductoUseCase.execute(tenant.schemaName, id, req.body);
      res.status(200).json({ success: true, message: 'Producto actualizado exitosamente', data: producto });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteProducto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      await catalogoRepo.deleteProducto(tenant.schemaName, id);
      res.status(200).json({ success: true, message: 'Producto eliminado exitosamente' });
    } catch (err) {
      next(err);
    }
  }

  // ================= VARIANTES =================
  public static async listVariantes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const productoId = String(req.params.productoId);
      const variantes = await catalogoRepo.listVariantesByProducto(tenant.schemaName, productoId);
      res.status(200).json({ success: true, count: variantes.length, data: variantes });
    } catch (err) {
      next(err);
    }
  }

  public static async createVariante(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const productoId = String(req.params.productoId);
      const variante = await createVarianteUseCase.execute(tenant.schemaName, { ...req.body, productoId });
      res.status(201).json({ success: true, message: 'Variante creada exitosamente', data: variante });
    } catch (err) {
      next(err);
    }
  }

  public static async updateVariante(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const variante = await catalogoRepo.updateVariante(tenant.schemaName, id, req.body);
      res.status(200).json({ success: true, message: 'Variante actualizada exitosamente', data: variante });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteVariante(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      await catalogoRepo.deleteVariante(tenant.schemaName, id);
      res.status(200).json({ success: true, message: 'Variante eliminada exitosamente' });
    } catch (err) {
      next(err);
    }
  }

  // ================= LISTAS DE PRECIOS =================
  public static async listListasPrecios(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const listas = await catalogoRepo.listListasPrecios(tenant.schemaName);
      res.status(200).json({ success: true, count: listas.length, data: listas });
    } catch (err) {
      next(err);
    }
  }

  public static async createListaPrecio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const lista = new ListaPrecio({
        id: `lp_${uuidv4().substring(0, 8)}`,
        ...req.body,
      });
      const creada = await catalogoRepo.createListaPrecio(tenant.schemaName, lista);
      res.status(201).json({ success: true, message: 'Lista de precios creada exitosamente', data: creada });
    } catch (err) {
      next(err);
    }
  }

  public static async setPrecioProducto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const precio = new PrecioProducto({
        id: `pr_${uuidv4().substring(0, 8)}`,
        ...req.body,
      });
      const guardado = await catalogoRepo.setPrecioProducto(tenant.schemaName, precio);
      res.status(200).json({ success: true, message: 'Precio configurado exitosamente', data: guardado });
    } catch (err) {
      next(err);
    }
  }

  public static async getPreciosProducto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const productoId = String(req.params.productoId);
      const listaPrecioId = req.query.listaPrecioId as string | undefined;
      const precios = await catalogoRepo.getPreciosProducto(tenant.schemaName, productoId, listaPrecioId);
      res.status(200).json({ success: true, count: precios.length, data: precios });
    } catch (err) {
      next(err);
    }
  }

  // ================= PROVEEDOR-PRODUCTO (M:N) =================
  public static async vincularProveedor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const vinculo = await vincularProveedorUseCase.execute(tenant.schemaName, req.body);
      res.status(201).json({ success: true, message: 'Proveedor vinculado con el producto exitosamente', data: vinculo });
    } catch (err) {
      next(err);
    }
  }

  public static async desvincularProveedor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      await catalogoRepo.desvincularProveedorProducto(tenant.schemaName, id);
      res.status(200).json({ success: true, message: 'Vínculo proveedor-producto eliminado exitosamente' });
    } catch (err) {
      next(err);
    }
  }

  public static async listProveedoresDeProducto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const productoId = String(req.params.productoId);
      const proveedores = await catalogoRepo.listProveedoresDeProducto(tenant.schemaName, productoId);
      res.status(200).json({ success: true, count: proveedores.length, data: proveedores });
    } catch (err) {
      next(err);
    }
  }

  public static async listProductosDeProveedor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const proveedorId = String(req.params.proveedorId);
      const productos = await catalogoRepo.listProductosDeProveedor(tenant.schemaName, proveedorId);
      res.status(200).json({ success: true, count: productos.length, data: productos });
    } catch (err) {
      next(err);
    }
  }
}

