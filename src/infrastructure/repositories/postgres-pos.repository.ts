import { dbPool } from '../database/connection.js';
import {
  ICatalogoRepository,
  IOperacionRepository,
  IPosRepository,
  IFacturacionRepository,
} from '../../domain/repositories/pos.repository.interface.js';
import { Categoria, Producto, TipoImpuesto, UnidadMedida } from '../../domain/entities/catalogo.entity.js';
import { AreaOperativa, PuntoAtencion, EstadoPuntoAtencion, TipoPuntoAtencion } from '../../domain/entities/operacion.entity.js';
import { Comanda, ItemComanda, EstadoComanda, ModoAtencion, EstadoPreparacionItem } from '../../domain/entities/pos.entity.js';
import { FacturaFiscal, TipoDocumentoFiscal, EstadoDian } from '../../domain/entities/facturacion.entity.js';

function sanitizeSchema(schemaName: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error(`Nombre de esquema no seguro: ${schemaName}`);
  }
  return schemaName;
}

export class PostgresPosRepository
  implements ICatalogoRepository, IOperacionRepository, IPosRepository, IFacturacionRepository
{
  // ================= CATÁLOGO =================
  public async listCategorias(schemaName: string): Promise<Categoria[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".categorias WHERE activo = true ORDER BY orden ASC`);
    return res.rows.map((r) => new Categoria({
      id: r.id,
      nombre: r.nombre,
      icono: r.icono,
      color: r.color,
      orden: r.orden,
      activo: r.activo,
    }));
  }

  public async listProductos(schemaName: string, categoriaId?: string, search?: string): Promise<Producto[]> {
    const s = sanitizeSchema(schemaName);
    let query = `SELECT * FROM "${s}".productos WHERE activo = true`;
    const params: any[] = [];

    if (categoriaId) {
      params.push(categoriaId);
      query += ` AND categoria_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nombre ILIKE $${params.length} OR sku ILIKE $${params.length} OR codigo_barras ILIKE $${params.length})`;
    }
    query += ` ORDER BY nombre ASC`;

    const res = await dbPool.query(query, params);
    return res.rows.map((r) => new Producto({
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
      requiereKds: r.requiere_kds,
      stockActual: Number(r.stock_actual),
      stockMinimo: Number(r.stock_minimo),
      activo: r.activo,
    }));
  }

  public async getProductoById(schemaName: string, id: string): Promise<Producto | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".productos WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
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
      requiereKds: r.requiere_kds,
      stockActual: Number(r.stock_actual),
      stockMinimo: Number(r.stock_minimo),
      activo: r.activo,
    });
  }

  public async getProductoByBarcode(schemaName: string, barcode: string): Promise<Producto | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".productos WHERE codigo_barras = $1 OR sku = $1`, [barcode]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
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
      requiereKds: r.requiere_kds,
      stockActual: Number(r.stock_actual),
      stockMinimo: Number(r.stock_minimo),
      activo: r.activo,
    });
  }

  public async createProducto(schemaName: string, p: Producto): Promise<Producto> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".productos (
        id, categoria_id, nombre, descripcion, sku, codigo_barras,
        precio_base, costo, tipo_impuesto, unidad_medida, requiere_kds, stock_actual, stock_minimo, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        p.id, p.categoriaId, p.nombre, p.descripcion || null, p.sku || null, p.codigoBarras || null,
        p.precioBase, p.costo, p.tipoImpuesto, p.unidadMedida, p.requiereKds, p.stockActual, p.stockMinimo, p.activo
      ]
    );
    return p;
  }

  // ================= OPERACIÓN / ÁREAS =================
  public async listAreas(schemaName: string): Promise<AreaOperativa[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".areas_operativas WHERE activo = true`);
    return res.rows.map((r) => new AreaOperativa({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      activo: r.activo,
    }));
  }

  public async listPuntosAtencion(schemaName: string, areaId?: string): Promise<PuntoAtencion[]> {
    const s = sanitizeSchema(schemaName);
    let query = `SELECT * FROM "${s}".puntos_atencion WHERE activo = true`;
    const params: any[] = [];
    if (areaId) {
      params.push(areaId);
      query += ` AND area_id = $1`;
    }
    query += ` ORDER BY codigo ASC`;
    const res = await dbPool.query(query, params);
    return res.rows.map((r) => new PuntoAtencion({
      id: r.id,
      areaId: r.area_id,
      nombre: r.nombre,
      codigo: r.codigo,
      tipo: r.tipo as TipoPuntoAtencion,
      capacidad: r.capacidad,
      estado: r.estado as EstadoPuntoAtencion,
      activo: r.activo,
    }));
  }

  public async getPuntoAtencionById(schemaName: string, id: string): Promise<PuntoAtencion | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".puntos_atencion WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new PuntoAtencion({
      id: r.id,
      areaId: r.area_id,
      nombre: r.nombre,
      codigo: r.codigo,
      tipo: r.tipo as TipoPuntoAtencion,
      capacidad: r.capacidad,
      estado: r.estado as EstadoPuntoAtencion,
      activo: r.activo,
    });
  }

  public async updateEstadoPunto(schemaName: string, id: string, estado: EstadoPuntoAtencion): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".puntos_atencion SET estado = $1 WHERE id = $2`, [estado, id]);
  }

  // ================= POS & COMANDAS =================
  public async createComanda(schemaName: string, c: Comanda): Promise<Comanda> {
    const s = sanitizeSchema(schemaName);
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const totalImpuestos = c.totalImpuestos;

      await client.query(
        `INSERT INTO "${s}".ventas_comandas (
          id, numero_comanda, modo_atencion, punto_atencion_id, estado,
          cliente_nombre, cliente_nit, subtotal, descuento, propina_sugerida,
          impuesto_consumo, iva, total, notas, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          c.id, c.numeroComanda, c.modoAtencion, c.puntoAtencionId || null, c.estado,
          c.clienteNombre, c.clienteNit, c.subtotal, c.descuento, c.propinaSugerida,
          totalImpuestos.impoconsumo8, totalImpuestos.iva19 + totalImpuestos.iva5, c.total,
          c.notas || null, c.createdAt, c.updatedAt
        ]
      );

      for (const item of c.items) {
        await client.query(
          `INSERT INTO "${s}".items_comanda (
            id, comanda_id, producto_id, nombre_producto, cantidad, precio_unitario,
            tipo_impuesto, notas_cocina, requiere_kds, estado_preparacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            item.id, c.id, item.productoId, item.nombreProducto, item.cantidad,
            item.precioUnitario, item.tipoImpuesto, item.notasCocina || null,
            item.requiereKds, item.estadoPreparacion
          ]
        );
      }

      if (c.puntoAtencionId) {
        await client.query(`UPDATE "${s}".puntos_atencion SET estado = 'OCUPADO' WHERE id = $1`, [c.puntoAtencionId]);
      }

      await client.query('COMMIT');
      return c;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async getComandaById(schemaName: string, id: string): Promise<Comanda | null> {
    const s = sanitizeSchema(schemaName);
    const cRes = await dbPool.query(
      `SELECT c.*, p.nombre as punto_nombre 
       FROM "${s}".ventas_comandas c 
       LEFT JOIN "${s}".puntos_atencion p ON c.punto_atencion_id = p.id 
       WHERE c.id = $1`,
      [id]
    );
    if (cRes.rows.length === 0) return null;
    const r = cRes.rows[0];

    const itemsRes = await dbPool.query(
      `SELECT * FROM "${s}".items_comanda WHERE comanda_id = $1`,
      [id]
    );

    const items = itemsRes.rows.map((ir) => new ItemComanda({
      id: ir.id,
      comandaId: ir.comanda_id,
      productoId: ir.producto_id,
      nombreProducto: ir.nombre_producto,
      cantidad: Number(ir.cantidad),
      precioUnitario: Number(ir.precio_unitario),
      tipoImpuesto: ir.tipo_impuesto as TipoImpuesto,
      notasCocina: ir.notas_cocina,
      requiereKds: ir.requiere_kds,
      estadoPreparacion: ir.estado_preparacion as EstadoPreparacionItem,
    }));

    return new Comanda({
      id: r.id,
      numeroComanda: r.numero_comanda,
      modoAtencion: r.modo_atencion as ModoAtencion,
      puntoAtencionId: r.punto_atencion_id,
      puntoAtencionNombre: r.punto_nombre,
      estado: r.estado as EstadoComanda,
      clienteNombre: r.cliente_nombre,
      clienteNit: r.cliente_nit,
      descuento: Number(r.descuento),
      incluyePropina: Number(r.propina_sugerida) > 0,
      notas: r.notas,
      items,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    });
  }

  public async listComandasActivas(schemaName: string): Promise<Comanda[]> {
    const s = sanitizeSchema(schemaName);

    // Single query with JOIN to avoid N+1 — loads comandas + items in one round trip
    const res = await dbPool.query(
      `SELECT 
         c.id, c.numero_comanda, c.modo_atencion, c.punto_atencion_id, c.estado,
         c.cliente_nombre, c.cliente_nit, c.subtotal, c.descuento, c.propina_sugerida,
         c.impuesto_consumo, c.iva, c.total, c.notas, c.created_at, c.updated_at,
         p.nombre as punto_nombre,
         COALESCE(json_agg(
           json_build_object(
             'id', i.id, 'comanda_id', i.comanda_id, 'producto_id', i.producto_id,
             'nombre_producto', i.nombre_producto, 'cantidad', i.cantidad,
             'precio_unitario', i.precio_unitario, 'tipo_impuesto', i.tipo_impuesto,
             'notas_cocina', i.notas_cocina, 'requiere_kds', i.requiere_kds,
             'estado_preparacion', i.estado_preparacion
           ) ORDER BY i.id
         ) FILTER (WHERE i.id IS NOT NULL), '[]') AS items_json
       FROM "${s}".ventas_comandas c
       LEFT JOIN "${s}".puntos_atencion p ON c.punto_atencion_id = p.id
       LEFT JOIN "${s}".items_comanda i ON i.comanda_id = c.id
       WHERE c.estado NOT IN ('COBRADO', 'CANCELADO')
       GROUP BY c.id, c.numero_comanda, c.modo_atencion, c.punto_atencion_id, c.estado,
                c.cliente_nombre, c.cliente_nit, c.subtotal, c.descuento, c.propina_sugerida,
                c.impuesto_consumo, c.iva, c.total, c.notas, c.created_at, c.updated_at,
                p.nombre
       ORDER BY c.created_at DESC`
    );

    return res.rows.map((r) => {
      const itemsRaw = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json;
      const items = (itemsRaw as any[]).map((ir: any) => new ItemComanda({
        id: ir.id,
        comandaId: ir.comanda_id,
        productoId: ir.producto_id,
        nombreProducto: ir.nombre_producto,
        cantidad: Number(ir.cantidad),
        precioUnitario: Number(ir.precio_unitario),
        tipoImpuesto: ir.tipo_impuesto as TipoImpuesto,
        notasCocina: ir.notas_cocina,
        requiereKds: ir.requiere_kds,
        estadoPreparacion: ir.estado_preparacion as EstadoPreparacionItem,
      }));

      return new Comanda({
        id: r.id,
        numeroComanda: r.numero_comanda,
        modoAtencion: r.modo_atencion as ModoAtencion,
        puntoAtencionId: r.punto_atencion_id,
        puntoAtencionNombre: r.punto_nombre,
        estado: r.estado as EstadoComanda,
        clienteNombre: r.cliente_nombre,
        clienteNit: r.cliente_nit,
        descuento: Number(r.descuento),
        incluyePropina: Number(r.propina_sugerida) > 0,
        notas: r.notas,
        items,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      });
    });
  }

  public async listKdsItems(schemaName: string): Promise<{ item: ItemComanda; comandaNumero: string; puntoAtencion?: string }[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT i.*, c.numero_comanda, p.nombre as punto_nombre
       FROM "${s}".items_comanda i
       JOIN "${s}".ventas_comandas c ON i.comanda_id = c.id
       LEFT JOIN "${s}".puntos_atencion p ON c.punto_atencion_id = p.id
       WHERE i.requiere_kds = true AND i.estado_preparacion != 'LISTO' AND c.estado NOT IN ('COBRADO', 'CANCELADO')
       ORDER BY c.created_at ASC`
    );

    return res.rows.map((r) => ({
      item: new ItemComanda({
        id: r.id,
        comandaId: r.comanda_id,
        productoId: r.producto_id,
        nombreProducto: r.nombre_producto,
        cantidad: Number(r.cantidad),
        precioUnitario: Number(r.precio_unitario),
        tipoImpuesto: r.tipo_impuesto as TipoImpuesto,
        notasCocina: r.notas_cocina,
        requiereKds: r.requiere_kds,
        estadoPreparacion: r.estado_preparacion as EstadoPreparacionItem,
      }),
      comandaNumero: r.numero_comanda,
      puntoAtencion: r.punto_nombre,
    }));
  }

  public async updateComandaEstado(schemaName: string, id: string, estado: EstadoComanda): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".ventas_comandas SET estado = $1, updated_at = NOW() WHERE id = $2`, [estado, id]);
  }

  public async updateItemKdsEstado(schemaName: string, itemId: string, estado: EstadoPreparacionItem): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".items_comanda SET estado_preparacion = $1 WHERE id = $2`, [estado, itemId]);
  }

  // ================= FACTURACIÓN FISCAL =================
  public async getNextConsecutivo(schemaName: string, prefijo: string): Promise<number> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT COALESCE(MAX(consecutivo), 890) + 1 as next_val FROM "${s}".facturas_fiscales WHERE prefijo = $1`,
      [prefijo]
    );
    return Number(res.rows[0].next_val);
  }

  public async createFactura(schemaName: string, f: FacturaFiscal): Promise<FacturaFiscal> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".facturas_fiscales (
        id, comanda_id, prefijo, consecutivo, numero_completo, tipo_documento,
        fecha_emision, fecha_vencimiento, cliente_nombre, cliente_nit,
        base_gravable, total_iva, total_impoconsumo, propina, total_pagar,
        estado_dian, cufe, qr_code, archivo_xml_key, archivo_pdf_key,
        metodo_pago, notas, factura_referencia_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
      [
        f.id, f.comandaId || null, f.prefijo, f.consecutivo, f.numeroCompleto, f.tipoDocumento,
        f.fechaEmision, f.fechaVencimiento, f.clienteNombre, f.clienteNit,
        f.baseGravable, f.totalIva, f.totalImpoconsumo, f.propina, f.totalPagar,
        f.estadoDian, f.cufe || null, f.qrCode || null, f.archivoXmlKey || null, f.archivoPdfKey || null,
        f.metodoPago || 'EFECTIVO', f.notas || null, f.facturaReferenciaId || null
      ]
    );
    return f;
  }

  public async listFacturas(schemaName: string, limit: number = 50): Promise<FacturaFiscal[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT * FROM "${s}".facturas_fiscales ORDER BY fecha_emision DESC LIMIT $1`,
      [limit]
    );
    return res.rows.map((r) => this.mapRowToFactura(r));
  }

  /**
   * Optimized listing with server-side filtering, search, and cursor-based pagination.
   * Single query — no N+1. Designed for poor-connection environments with minimal payload.
   */
  public async listFacturasWithFilters(
    schemaName: string,
    filters: {
      estado?: string;
      search?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      tipoDocumento?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ facturas: FacturaFiscal[]; total: number; page: number; totalPages: number }> {
    const s = sanitizeSchema(schemaName);
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.estado && filters.estado !== 'TODAS') {
      params.push(filters.estado);
      whereClause += ` AND f.estado_dian = $${params.length}`;
    }

    if (filters.tipoDocumento) {
      params.push(filters.tipoDocumento);
      whereClause += ` AND f.tipo_documento = $${params.length}`;
    }

    if (filters.fechaDesde) {
      params.push(filters.fechaDesde);
      whereClause += ` AND f.fecha_emision >= $${params.length}::timestamptz`;
    }

    if (filters.fechaHasta) {
      params.push(filters.fechaHasta);
      whereClause += ` AND f.fecha_emision <= $${params.length}::timestamptz`;
    }

    if (filters.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      whereClause += ` AND (f.numero_completo ILIKE $${params.length} OR f.cliente_nombre ILIKE $${params.length} OR f.cliente_nit ILIKE $${params.length})`;
    }

    // Count + data in a single round trip using CTE
    const countParam = params.length + 1;
    const limitParam = params.length + 2;
    params.push(offset, limit);

    const query = `
      WITH filtered AS (
        SELECT f.* FROM "${s}".facturas_fiscales f ${whereClause}
      )
      SELECT 
        (SELECT COUNT(*) FROM filtered) AS total_count,
        f.*
      FROM filtered f
      ORDER BY f.fecha_emision DESC
      OFFSET $${countParam} LIMIT $${limitParam}
    `;

    const res = await dbPool.query(query, params);

    const total = res.rows.length > 0 ? Number(res.rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      facturas: res.rows.map((r) => this.mapRowToFactura(r)),
      total,
      page,
      totalPages,
    };
  }

  public async getFacturaById(schemaName: string, id: string): Promise<FacturaFiscal | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".facturas_fiscales WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToFactura(res.rows[0]);
  }

  public async updateFacturaEstado(schemaName: string, id: string, estado: EstadoDian): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `UPDATE "${s}".facturas_fiscales SET estado_dian = $1 WHERE id = $2`,
      [estado, id]
    );
  }

  /**
   * Registra un pago parcial o total contra una factura existente.
   */
  public async createPagoFactura(
    schemaName: string,
    pago: { id: string; facturaId: string; monto: number; metodoPago: string; referencia?: string; notas?: string }
  ): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".pagos_factura (id, factura_id, monto, metodo_pago, referencia, notas)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [pago.id, pago.facturaId, pago.monto, pago.metodoPago, pago.referencia || null, pago.notas || null]
    );
  }

  /**
   * Obtiene todos los pagos asociados a una factura (sin N+1).
   */
  public async listPagosFactura(schemaName: string, facturaId: string): Promise<any[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT * FROM "${s}".pagos_factura WHERE factura_id = $1 ORDER BY created_at ASC`,
      [facturaId]
    );
    return res.rows;
  }

  /**
   * Resumen financiero: totales por estado, ingreso del mes, cuentas por cobrar.
   * Single aggregated query — no N+1. Optimized for dashboard widgets.
   */
  public async getResumenFinanciero(schemaName: string): Promise<{
    totalFacturado: number;
    totalCobrado: number;
    totalPendiente: number;
    totalVencido: number;
    totalAnulado: number;
    facturasEsteMes: number;
    ingresoEsteMes: number;
    cuentasPorCobrar: number;
  }> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`
      SELECT
        COALESCE(SUM(total_pagar), 0) AS total_facturado,
        COALESCE(SUM(CASE WHEN estado_dian = 'ACEPTADA' THEN total_pagar ELSE 0 END), 0) AS total_cobrado,
        COALESCE(SUM(CASE WHEN estado_dian IN ('PENDIENTE', 'PAGO_PARCIAL') THEN total_pagar ELSE 0 END), 0) AS total_pendiente,
        COALESCE(SUM(CASE WHEN estado_dian = 'VENCIDA' THEN total_pagar ELSE 0 END), 0) AS total_vencido,
        COALESCE(SUM(CASE WHEN estado_dian = 'ANULADA' THEN total_pagar ELSE 0 END), 0) AS total_anulado,
        COUNT(CASE WHEN fecha_emision >= date_trunc('month', CURRENT_DATE) THEN 1 END) AS facturas_este_mes,
        COALESCE(SUM(CASE WHEN fecha_emision >= date_trunc('month', CURRENT_DATE) AND estado_dian = 'ACEPTADA' THEN total_pagar ELSE 0 END), 0) AS ingreso_este_mes,
        COALESCE(SUM(CASE WHEN estado_dian IN ('PENDIENTE', 'PAGO_PARCIAL', 'VENCIDA') THEN total_pagar ELSE 0 END), 0) AS cuentas_por_cobrar
      FROM "${s}".facturas_fiscales
      WHERE tipo_documento != 'NOTA_CREDITO_DIAN'
    `);

    const row = res.rows[0];
    return {
      totalFacturado: Number(row.total_facturado),
      totalCobrado: Number(row.total_cobrado),
      totalPendiente: Number(row.total_pendiente),
      totalVencido: Number(row.total_vencido),
      totalAnulado: Number(row.total_anulado),
      facturasEsteMes: Number(row.facturas_este_mes),
      ingresoEsteMes: Number(row.ingreso_este_mes),
      cuentasPorCobrar: Number(row.cuentas_por_cobrar),
    };
  }

  /**
   * Helper: maps a raw DB row to a FacturaFiscal entity (DRY, no duplication).
   */
  private mapRowToFactura(r: any): FacturaFiscal {
    return new FacturaFiscal({
      id: r.id,
      comandaId: r.comanda_id,
      prefijo: r.prefijo,
      consecutivo: r.consecutivo,
      tipoDocumento: r.tipo_documento as TipoDocumentoFiscal,
      fechaEmision: new Date(r.fecha_emision),
      fechaVencimiento: new Date(r.fecha_vencimiento),
      clienteNombre: r.cliente_nombre,
      clienteNit: r.cliente_nit,
      baseGravable: Number(r.base_gravable),
      totalIva: Number(r.total_iva),
      totalImpoconsumo: Number(r.total_impoconsumo),
      propina: Number(r.propina),
      totalPagar: Number(r.total_pagar),
      estadoDian: r.estado_dian as EstadoDian,
      cufe: r.cufe,
      qrCode: r.qr_code,
      archivoXmlKey: r.archivo_xml_key,
      archivoPdfKey: r.archivo_pdf_key,
      metodoPago: r.metodo_pago,
      notas: r.notas,
      facturaReferenciaId: r.factura_referencia_id,
    });
  }
}
