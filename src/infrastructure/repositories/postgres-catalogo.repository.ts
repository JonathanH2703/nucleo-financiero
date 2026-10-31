import { dbPool } from '../database/connection.js';
import { ICatalogoRepository } from '../../domain/repositories/catalogo.repository.interface.js';
import { Categoria, CategoriaProps, Producto, ProductoProps } from '../../domain/entities/catalogo.entity.js';
import { ProductoVariante, ProductoVarianteProps } from '../../domain/entities/producto-variante.entity.js';
import { ListaPrecio, ListaPrecioProps, PrecioProducto } from '../../domain/entities/lista-precio.entity.js';
import { ProveedorProducto, ProveedorProductoProps } from '../../domain/entities/proveedor-producto.entity.js';
import { TipoImpuesto, UnidadMedida } from '../../domain/entities/tipos-comunes.js';

function sanitizeSchema(schemaName: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error(`Nombre de esquema no seguro: ${schemaName}`);
  }
  return schemaName;
}

export class PostgresCatalogoRepository implements ICatalogoRepository {
  // ================= CATEGORÍAS =================
  public async createCategoria(schemaName: string, cat: Categoria): Promise<Categoria> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".categorias (
        id, nombre, icono, color, orden, activo, categoria_padre_id, slug, descripcion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        cat.id,
        cat.nombre,
        cat.icono,
        cat.color,
        cat.orden,
        cat.activo,
        cat.categoriaPadreId || null,
        cat.slug || null,
        cat.descripcion || null,
      ]
    );
    return cat;
  }

  public async updateCategoria(schemaName: string, id: string, data: Partial<CategoriaProps>): Promise<Categoria> {
    const s = sanitizeSchema(schemaName);
    const existing = await this.getCategoriaById(schemaName, id);
    if (!existing) throw new Error(`Categoría con id ${id} no encontrada.`);

    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, string> = {
      nombre: 'nombre',
      icono: 'icono',
      color: 'color',
      orden: 'orden',
      activo: 'activo',
      categoriaPadreId: 'categoria_padre_id',
      slug: 'slug',
      descripcion: 'descripcion',
    };

    for (const [prop, col] of Object.entries(fields)) {
      if ((data as any)[prop] !== undefined) {
        setClauses.push(`${col} = $${p}`);
        values.push((data as any)[prop]);
        p++;
      }
    }

    if (setClauses.length === 0) return existing;

    values.push(id);
    const query = `UPDATE "${s}".categorias SET ${setClauses.join(', ')} WHERE id = $${p} RETURNING *`;
    const res = await dbPool.query(query, values);
    return this.mapCategoria(res.rows[0]);
  }

  public async deleteCategoria(schemaName: string, id: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".categorias SET activo = false WHERE id = $1`, [id]);
  }

  public async listCategorias(schemaName: string): Promise<Categoria[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".categorias WHERE activo = true ORDER BY orden ASC, nombre ASC`);
    return res.rows.map((r) => this.mapCategoria(r));
  }

  public async getCategoriaById(schemaName: string, id: string): Promise<Categoria | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".categorias WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapCategoria(res.rows[0]);
  }

  // ================= PRODUCTOS =================
  public async createProducto(schemaName: string, p: Producto): Promise<Producto> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".productos (
        id, categoria_id, nombre, descripcion, sku, codigo_barras,
        precio_base, costo, tipo_impuesto, unidad_medida, requiere_kds,
        stock_actual, stock_minimo, activo, imagen_url, imagen_key, marca,
        tiene_lotes, tiene_vencimiento, unidad_medida_compra, factor_conversion_compra,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23
      )`,
      [
        p.id,
        p.categoriaId,
        p.nombre,
        p.descripcion || null,
        p.sku || null,
        p.codigoBarras || null,
        p.precioBase,
        p.costo,
        p.tipoImpuesto,
        p.unidadMedida,
        p.requiereKds,
        p.stockActual,
        p.stockMinimo,
        p.activo,
        p.imagenUrl || null,
        p.imagenKey || null,
        p.marca || null,
        p.tieneLotes,
        p.tieneVencimiento,
        p.unidadMedidaCompra,
        p.factorConversionCompra,
        p.createdAt,
        p.updatedAt,
      ]
    );
    return p;
  }

  public async updateProducto(schemaName: string, id: string, data: Partial<ProductoProps>): Promise<Producto> {
    const s = sanitizeSchema(schemaName);
    const existing = await this.getProductoById(schemaName, id);
    if (!existing) throw new Error(`Producto con id ${id} no encontrado.`);

    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, string> = {
      categoriaId: 'categoria_id',
      nombre: 'nombre',
      descripcion: 'descripcion',
      sku: 'sku',
      codigoBarras: 'codigo_barras',
      precioBase: 'precio_base',
      costo: 'costo',
      tipoImpuesto: 'tipo_impuesto',
      unidadMedida: 'unidad_medida',
      requiereKds: 'requiere_kds',
      stockActual: 'stock_actual',
      stockMinimo: 'stock_minimo',
      activo: 'activo',
      imagenUrl: 'imagen_url',
      imagenKey: 'imagen_key',
      marca: 'marca',
      tieneLotes: 'tiene_lotes',
      tieneVencimiento: 'tiene_vencimiento',
      unidadMedidaCompra: 'unidad_medida_compra',
      factorConversionCompra: 'factor_conversion_compra',
    };

    for (const [prop, col] of Object.entries(fields)) {
      if ((data as any)[prop] !== undefined) {
        setClauses.push(`${col} = $${p}`);
        values.push((data as any)[prop]);
        p++;
      }
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE "${s}".productos SET ${setClauses.join(', ')} WHERE id = $${p} RETURNING *`;
    const res = await dbPool.query(query, values);
    return this.mapProducto(res.rows[0]);
  }

  public async deleteProducto(schemaName: string, id: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".productos SET activo = false, updated_at = NOW() WHERE id = $1`, [id]);
  }

  public async listProductos(
    schemaName: string,
    filters?: {
      categoriaId?: string;
      search?: string;
      activo?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ productos: Producto[]; total: number; page: number; totalPages: number }> {
    const s = sanitizeSchema(schemaName);
    const conditions: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (filters?.activo !== undefined) {
      conditions.push(`p.activo = $${p}`);
      values.push(filters.activo);
      p++;
    } else {
      conditions.push(`p.activo = true`);
    }

    if (filters?.categoriaId) {
      conditions.push(`p.categoria_id = $${p}`);
      values.push(filters.categoriaId);
      p++;
    }

    if (filters?.search && filters.search.trim()) {
      conditions.push(
        `(p.nombre ILIKE $${p} OR p.sku ILIKE $${p} OR p.codigo_barras ILIKE $${p} OR p.marca ILIKE $${p})`
      );
      values.push(`%${filters.search.trim()}%`);
      p++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 50));
    const offset = (page - 1) * limit;

    const countParam = p;
    const limitParam = p + 1;
    values.push(offset, limit);

    const query = `
      WITH filtered AS (
        SELECT p.* FROM "${s}".productos p ${whereClause}
      )
      SELECT 
        (SELECT COUNT(*) FROM filtered) AS total_count,
        f.*
      FROM filtered f
      ORDER BY f.nombre ASC
      OFFSET $${countParam} LIMIT $${limitParam}
    `;

    const res = await dbPool.query(query, values);
    const total = res.rows.length > 0 ? Number(res.rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      productos: res.rows.map((r) => this.mapProducto(r)),
      total,
      page,
      totalPages,
    };
  }

  public async getProductoById(schemaName: string, id: string): Promise<Producto | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".productos WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapProducto(res.rows[0]);
  }

  public async getProductoByBarcode(schemaName: string, barcode: string): Promise<Producto | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT * FROM "${s}".productos WHERE (codigo_barras = $1 OR sku = $1) AND activo = true`,
      [barcode]
    );
    if (res.rows.length === 0) return null;
    return this.mapProducto(res.rows[0]);
  }

  // ================= VARIANTES =================
  public async createVariante(schemaName: string, v: ProductoVariante): Promise<ProductoVariante> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".producto_variantes (
        id, producto_id, nombre, sku, codigo_barras, unidad_medida, factor_conversion,
        precio_base, costo, activo, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        v.id,
        v.productoId,
        v.nombre,
        v.sku || null,
        v.codigoBarras || null,
        v.unidadMedida,
        v.factorConversion,
        v.precioBase,
        v.costo,
        v.activo,
        v.createdAt,
      ]
    );
    return v;
  }

  public async updateVariante(schemaName: string, id: string, data: Partial<ProductoVarianteProps>): Promise<ProductoVariante> {
    const s = sanitizeSchema(schemaName);
    const existing = await this.getVarianteById(schemaName, id);
    if (!existing) throw new Error(`Variante con id ${id} no encontrada.`);

    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, string> = {
      nombre: 'nombre',
      sku: 'sku',
      codigoBarras: 'codigo_barras',
      unidadMedida: 'unidad_medida',
      factorConversion: 'factor_conversion',
      precioBase: 'precio_base',
      costo: 'costo',
      activo: 'activo',
    };

    for (const [prop, col] of Object.entries(fields)) {
      if ((data as any)[prop] !== undefined) {
        setClauses.push(`${col} = $${p}`);
        values.push((data as any)[prop]);
        p++;
      }
    }

    if (setClauses.length === 0) return existing;

    values.push(id);
    const query = `UPDATE "${s}".producto_variantes SET ${setClauses.join(', ')} WHERE id = $${p} RETURNING *`;
    const res = await dbPool.query(query, values);
    return this.mapVariante(res.rows[0]);
  }

  public async deleteVariante(schemaName: string, id: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".producto_variantes SET activo = false WHERE id = $1`, [id]);
  }

  public async listVariantesByProducto(schemaName: string, productoId: string): Promise<ProductoVariante[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT * FROM "${s}".producto_variantes WHERE producto_id = $1 AND activo = true ORDER BY nombre ASC`,
      [productoId]
    );
    return res.rows.map((r) => this.mapVariante(r));
  }

  public async getVarianteById(schemaName: string, id: string): Promise<ProductoVariante | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".producto_variantes WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapVariante(res.rows[0]);
  }

  // ================= LISTAS DE PRECIOS =================
  public async createListaPrecio(schemaName: string, l: ListaPrecio): Promise<ListaPrecio> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".listas_precios (id, nombre, descripcion, moneda, activa, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [l.id, l.nombre, l.descripcion || null, l.moneda, l.activa, l.createdAt]
    );
    return l;
  }

  public async updateListaPrecio(schemaName: string, id: string, data: Partial<ListaPrecioProps>): Promise<ListaPrecio> {
    const s = sanitizeSchema(schemaName);
    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (data.nombre !== undefined) {
      setClauses.push(`nombre = $${p++}`);
      values.push(data.nombre);
    }
    if (data.descripcion !== undefined) {
      setClauses.push(`descripcion = $${p++}`);
      values.push(data.descripcion);
    }
    if (data.activa !== undefined) {
      setClauses.push(`activa = $${p++}`);
      values.push(data.activa);
    }

    values.push(id);
    const res = await dbPool.query(
      `UPDATE "${s}".listas_precios SET ${setClauses.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );
    const r = res.rows[0];
    return new ListaPrecio({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      moneda: r.moneda,
      activa: r.activa,
      createdAt: new Date(r.created_at),
    });
  }

  public async listListasPrecios(schemaName: string): Promise<ListaPrecio[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".listas_precios WHERE activa = true ORDER BY nombre ASC`);
    return res.rows.map(
      (r) =>
        new ListaPrecio({
          id: r.id,
          nombre: r.nombre,
          descripcion: r.descripcion,
          moneda: r.moneda,
          activa: r.activa,
          createdAt: new Date(r.created_at),
        })
    );
  }

  public async setPrecioProducto(schemaName: string, precio: PrecioProducto): Promise<PrecioProducto> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".precios_producto (id, lista_precio_id, producto_id, variante_id, precio, descuento_maximo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (lista_precio_id, producto_id, variante_id) DO UPDATE SET
         precio = EXCLUDED.precio,
         descuento_maximo = EXCLUDED.descuento_maximo`,
      [precio.id, precio.listaPrecioId, precio.productoId, precio.varianteId || null, precio.precio, precio.descuentoMaximo]
    );
    return precio;
  }

  public async getPreciosProducto(schemaName: string, productoId: string, listaPrecioId?: string): Promise<PrecioProducto[]> {
    const s = sanitizeSchema(schemaName);
    let query = `SELECT * FROM "${s}".precios_producto WHERE producto_id = $1`;
    const params: any[] = [productoId];
    if (listaPrecioId) {
      params.push(listaPrecioId);
      query += ` AND lista_precio_id = $2`;
    }
    const res = await dbPool.query(query, params);
    return res.rows.map(
      (r) =>
        new PrecioProducto({
          id: r.id,
          listaPrecioId: r.lista_precio_id,
          productoId: r.producto_id,
          varianteId: r.variante_id,
          precio: Number(r.precio),
          descuentoMaximo: Number(r.descuento_maximo),
        })
    );
  }

  // ================= PROVEEDOR-PRODUCTO (M:N) =================
  public async vincularProveedorProducto(schemaName: string, rel: ProveedorProducto): Promise<ProveedorProducto> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".proveedor_producto (
        id, proveedor_id, producto_id, precio_compra, unidad_compra,
        tiempo_entrega_dias, es_proveedor_principal, notas, activo, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (proveedor_id, producto_id) DO UPDATE SET
        precio_compra = EXCLUDED.precio_compra,
        unidad_compra = EXCLUDED.unidad_compra,
        tiempo_entrega_dias = EXCLUDED.tiempo_entrega_dias,
        es_proveedor_principal = EXCLUDED.es_proveedor_principal,
        notas = EXCLUDED.notas,
        activo = true,
        updated_at = NOW()`,
      [
        rel.id,
        rel.proveedorId,
        rel.productoId,
        rel.precioCompra,
        rel.unidadCompra,
        rel.tiempoEntregaDias,
        rel.esProveedorPrincipal,
        rel.notas || null,
        rel.activo,
        rel.updatedAt,
      ]
    );
    return rel;
  }

  public async actualizarProveedorProducto(
    schemaName: string,
    id: string,
    data: Partial<ProveedorProductoProps>
  ): Promise<ProveedorProducto> {
    const s = sanitizeSchema(schemaName);
    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, string> = {
      precioCompra: 'precio_compra',
      unidadCompra: 'unidad_compra',
      tiempoEntregaDias: 'tiempo_entrega_dias',
      esProveedorPrincipal: 'es_proveedor_principal',
      notas: 'notas',
      activo: 'activo',
    };

    for (const [prop, col] of Object.entries(fields)) {
      if ((data as any)[prop] !== undefined) {
        setClauses.push(`${col} = $${p++}`);
        values.push((data as any)[prop]);
      }
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE "${s}".proveedor_producto SET ${setClauses.join(', ')} WHERE id = $${p} RETURNING *`;
    const res = await dbPool.query(query, values);
    return this.mapProveedorProducto(res.rows[0]);
  }

  public async desvincularProveedorProducto(schemaName: string, id: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".proveedor_producto SET activo = false, updated_at = NOW() WHERE id = $1`, [id]);
  }

  public async listProveedoresDeProducto(schemaName: string, productoId: string): Promise<ProveedorProducto[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT * FROM "${s}".proveedor_producto WHERE producto_id = $1 AND activo = true ORDER BY es_proveedor_principal DESC, precio_compra ASC`,
      [productoId]
    );
    return res.rows.map((r) => this.mapProveedorProducto(r));
  }

  public async listProductosDeProveedor(schemaName: string, proveedorId: string): Promise<ProveedorProducto[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT * FROM "${s}".proveedor_producto WHERE proveedor_id = $1 AND activo = true`,
      [proveedorId]
    );
    return res.rows.map((r) => this.mapProveedorProducto(r));
  }

  // ================= HELPERS =================
  private mapCategoria(r: any): Categoria {
    return new Categoria({
      id: r.id,
      nombre: r.nombre,
      icono: r.icono,
      color: r.color,
      orden: Number(r.orden),
      activo: Boolean(r.activo),
      categoriaPadreId: r.categoria_padre_id,
      slug: r.slug,
      descripcion: r.descripcion,
    });
  }

  private mapProducto(r: any): Producto {
    return new Producto({
      id: r.id,
      categoriaId: r.categoria_id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      sku: r.sku,
      codigoBarras: r.codigo_barras,
      precioBase: Number(r.precio_base),
      costo: Number(r.costo),
      tipoImpuesto: r.tipo_impuesto as TipoImpuesto,
      unidadMedida: r.unidad_medida as UnidadMedida,
      requiereKds: Boolean(r.requiere_kds),
      stockActual: Number(r.stock_actual),
      stockMinimo: Number(r.stock_minimo),
      activo: Boolean(r.activo),
      imagenUrl: r.imagen_url,
      imagenKey: r.imagen_key,
      marca: r.marca,
      tieneLotes: Boolean(r.tiene_lotes),
      tieneVencimiento: Boolean(r.tiene_vencimiento),
      unidadMedidaCompra: r.unidad_medida_compra as UnidadMedida,
      factorConversionCompra: Number(r.factor_conversion_compra || 1),
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    });
  }

  private mapVariante(r: any): ProductoVariante {
    return new ProductoVariante({
      id: r.id,
      productoId: r.producto_id,
      nombre: r.nombre,
      sku: r.sku,
      codigoBarras: r.codigo_barras,
      unidadMedida: r.unidad_medida as UnidadMedida,
      factorConversion: Number(r.factor_conversion),
      precioBase: Number(r.precio_base),
      costo: Number(r.costo),
      activo: Boolean(r.activo),
      createdAt: new Date(r.created_at),
    });
  }

  private mapProveedorProducto(r: any): ProveedorProducto {
    return new ProveedorProducto({
      id: r.id,
      proveedorId: r.proveedor_id,
      productoId: r.producto_id,
      precioCompra: Number(r.precio_compra),
      unidadCompra: r.unidad_compra as UnidadMedida,
      tiempoEntregaDias: Number(r.tiempo_entrega_dias || 0),
      esProveedorPrincipal: Boolean(r.es_proveedor_principal),
      notas: r.notas,
      activo: Boolean(r.activo),
      updatedAt: new Date(r.updated_at),
    });
  }
}

