import { dbPool } from '../database/connection.js';
import { IComprasRepository } from '../../domain/repositories/compras.repository.interface.js';
import {
  OrdenCompra,
  OrdenCompraProps,
  OrdenCompraItem,
  RecepcionCompra,
  RecepcionItem,
  CuentaPorPagar,
  CuentaPorPagarProps,
} from '../../domain/entities/compras.entity.js';
import { EstadoOrdenCompra, EstadoCuentaPorPagar } from '../../domain/entities/tipos-comunes.js';

function sanitizeSchema(schemaName: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error(`Nombre de esquema no seguro: ${schemaName}`);
  }
  return schemaName;
}

export class PostgresComprasRepository implements IComprasRepository {
  // ================= ÓRDENES DE COMPRA =================
  public async createOrden(schemaName: string, oc: OrdenCompra): Promise<OrdenCompra> {
    const s = sanitizeSchema(schemaName);
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO "${s}".ordenes_compra (
          id, proveedor_id, proveedor_nombre, bodega_destino_id, numero, estado,
          fecha_emision, fecha_entrega_estimada, subtotal, impuestos, total, notas, creado_por, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          oc.id,
          oc.proveedorId,
          oc.proveedorNombre || null,
          oc.bodegaDestinoId,
          oc.numero,
          oc.estado,
          oc.fechaEmision,
          oc.fechaEntregaEstimada || null,
          oc.subtotal,
          oc.impuestos,
          oc.total,
          oc.notas || null,
          oc.creadoPor || null,
          oc.createdAt,
        ]
      );

      for (const item of oc.items) {
        await client.query(
          `INSERT INTO "${s}".orden_compra_items (
            id, orden_id, producto_id, variante_id, producto_nombre,
            cantidad_solicitada, cantidad_recibida, precio_unitario, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            item.id,
            oc.id,
            item.productoId,
            item.varianteId || null,
            item.productoNombre,
            item.cantidadSolicitada,
            item.cantidadRecibida,
            item.precioUnitario,
            item.subtotal,
          ]
        );
      }

      await client.query('COMMIT');
      return oc;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async updateOrden(schemaName: string, id: string, data: Partial<OrdenCompraProps>): Promise<OrdenCompra> {
    const s = sanitizeSchema(schemaName);
    const existing = await this.getOrdenById(schemaName, id);
    if (!existing) throw new Error(`Orden de compra ${id} no encontrada.`);

    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, string> = {
      proveedorId: 'proveedor_id',
      proveedorNombre: 'proveedor_nombre',
      bodegaDestinoId: 'bodega_destino_id',
      estado: 'estado',
      fechaEntregaEstimada: 'fecha_entrega_estimada',
      subtotal: 'subtotal',
      impuestos: 'impuestos',
      total: 'total',
      notas: 'notas',
    };

    for (const [prop, col] of Object.entries(fields)) {
      if ((data as any)[prop] !== undefined) {
        setClauses.push(`${col} = $${p++}`);
        values.push((data as any)[prop]);
      }
    }

    if (setClauses.length > 0) {
      values.push(id);
      await dbPool.query(`UPDATE "${s}".ordenes_compra SET ${setClauses.join(', ')} WHERE id = $${p}`, values);
    }

    return (await this.getOrdenById(schemaName, id))!;
  }

  public async getOrdenById(schemaName: string, id: string): Promise<OrdenCompra | null> {
    const s = sanitizeSchema(schemaName);
    const oRes = await dbPool.query(`SELECT * FROM "${s}".ordenes_compra WHERE id = $1`, [id]);
    if (oRes.rows.length === 0) return null;
    const r = oRes.rows[0];

    const itemsRes = await dbPool.query(`SELECT * FROM "${s}".orden_compra_items WHERE orden_id = $1`, [id]);
    const items = itemsRes.rows.map(
      (ir) =>
        new OrdenCompraItem({
          id: ir.id,
          ordenId: ir.orden_id,
          productoId: ir.producto_id,
          varianteId: ir.variante_id,
          productoNombre: ir.producto_nombre,
          cantidadSolicitada: Number(ir.cantidad_solicitada),
          cantidadRecibida: Number(ir.cantidad_recibida),
          precioUnitario: Number(ir.precio_unitario),
          subtotal: Number(ir.subtotal),
        })
    );

    return new OrdenCompra({
      id: r.id,
      proveedorId: r.proveedor_id,
      proveedorNombre: r.proveedor_nombre,
      bodegaDestinoId: r.bodega_destino_id,
      numero: r.numero,
      estado: r.estado as EstadoOrdenCompra,
      fechaEmision: new Date(r.fecha_emision),
      fechaEntregaEstimada: r.fecha_entrega_estimada ? new Date(r.fecha_entrega_estimada) : undefined,
      subtotal: Number(r.subtotal),
      impuestos: Number(r.impuestos),
      total: Number(r.total),
      notas: r.notas,
      creadoPor: r.creado_por,
      items,
      createdAt: new Date(r.created_at),
    });
  }

  public async listOrdenes(
    schemaName: string,
    filters?: { estado?: string; proveedorId?: string; search?: string; page?: number; limit?: number }
  ): Promise<{ ordenes: OrdenCompra[]; total: number; page: number; totalPages: number }> {
    const s = sanitizeSchema(schemaName);
    const conditions: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (filters?.estado) {
      conditions.push(`estado = $${p++}`);
      values.push(filters.estado);
    }
    if (filters?.proveedorId) {
      conditions.push(`proveedor_id = $${p++}`);
      values.push(filters.proveedorId);
    }
    if (filters?.search && filters.search.trim()) {
      conditions.push(`(numero ILIKE $${p} OR proveedor_nombre ILIKE $${p})`);
      values.push(`%${filters.search.trim()}%`);
      p++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 25));
    const offset = (page - 1) * limit;

    const countParam = p++;
    const limitParam = p++;
    values.push(offset, limit);

    const query = `
      WITH filtered AS (
        SELECT * FROM "${s}".ordenes_compra ${whereClause}
      )
      SELECT 
        (SELECT COUNT(*) FROM filtered) AS total_count,
        f.*
      FROM filtered f
      ORDER BY f.created_at DESC
      OFFSET $${countParam} LIMIT $${limitParam}
    `;

    const res = await dbPool.query(query, values);
    const total = res.rows.length > 0 ? Number(res.rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    const ordenes: OrdenCompra[] = [];
    for (const r of res.rows) {
      ordenes.push(
        new OrdenCompra({
          id: r.id,
          proveedorId: r.proveedor_id,
          proveedorNombre: r.proveedor_nombre,
          bodegaDestinoId: r.bodega_destino_id,
          numero: r.numero,
          estado: r.estado as EstadoOrdenCompra,
          fechaEmision: new Date(r.fecha_emision),
          fechaEntregaEstimada: r.fecha_entrega_estimada ? new Date(r.fecha_entrega_estimada) : undefined,
          subtotal: Number(r.subtotal),
          impuestos: Number(r.impuestos),
          total: Number(r.total),
          notas: r.notas,
          creadoPor: r.creado_por,
          items: [],
          createdAt: new Date(r.created_at),
        })
      );
    }

    return { ordenes, total, page, totalPages };
  }

  public async getNextNumeroOrden(schemaName: string): Promise<string> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT COUNT(*) as cnt FROM "${s}".ordenes_compra`);
    const nextVal = Number(res.rows[0].cnt) + 1;
    return `OC-${String(nextVal).padStart(5, '0')}`;
  }

  // ================= RECEPCIONES =================
  public async createRecepcion(schemaName: string, rec: RecepcionCompra): Promise<RecepcionCompra> {
    const s = sanitizeSchema(schemaName);
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO "${s}".recepciones_compra (
          id, orden_compra_id, proveedor_id, bodega_id, numero, fecha, recibido_por, notas, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          rec.id,
          rec.ordenCompraId || null,
          rec.proveedorId,
          rec.bodegaId,
          rec.numero,
          rec.fecha,
          rec.recibidoPor || null,
          rec.notas || null,
          rec.createdAt,
        ]
      );

      for (const item of rec.items) {
        await client.query(
          `INSERT INTO "${s}".recepcion_items (
            id, recepcion_id, producto_id, variante_id, cantidad_recibida, costo_unitario, lote_numero, fecha_vencimiento
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            item.id,
            rec.id,
            item.productoId,
            item.varianteId || null,
            item.cantidadRecibida,
            item.costoUnitario,
            item.loteNumero || null,
            item.fechaVencimiento || null,
          ]
        );

        // Si la recepción viene de una orden de compra, actualizar cantidad_recibida del item de orden
        if (rec.ordenCompraId) {
          await client.query(
            `UPDATE "${s}".orden_compra_items
             SET cantidad_recibida = cantidad_recibida + $1
             WHERE orden_id = $2 AND producto_id = $3 AND (variante_id = $4 OR (variante_id IS NULL AND $4 IS NULL))`,
            [item.cantidadRecibida, rec.ordenCompraId, item.productoId, item.varianteId || null]
          );
        }
      }

      // Si viene de una orden, verificar si se completó toda
      if (rec.ordenCompraId) {
        const pending = await client.query(
          `SELECT COUNT(*) as count FROM "${s}".orden_compra_items 
           WHERE orden_id = $1 AND cantidad_recibida < cantidad_solicitada`,
          [rec.ordenCompraId]
        );
        const allCompleted = Number(pending.rows[0].count) === 0;
        await client.query(`UPDATE "${s}".ordenes_compra SET estado = $1 WHERE id = $2`, [
          allCompleted ? 'RECIBIDA' : 'RECIBIDA_PARCIAL',
          rec.ordenCompraId,
        ]);
      }

      await client.query('COMMIT');
      return rec;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async getRecepcionById(schemaName: string, id: string): Promise<RecepcionCompra | null> {
    const s = sanitizeSchema(schemaName);
    const rRes = await dbPool.query(`SELECT * FROM "${s}".recepciones_compra WHERE id = $1`, [id]);
    if (rRes.rows.length === 0) return null;
    const r = rRes.rows[0];

    const itemsRes = await dbPool.query(`SELECT * FROM "${s}".recepcion_items WHERE recepcion_id = $1`, [id]);
    const items = itemsRes.rows.map(
      (ir) =>
        new RecepcionItem({
          id: ir.id,
          recepcionId: ir.recepcion_id,
          productoId: ir.producto_id,
          varianteId: ir.variante_id,
          cantidadRecibida: Number(ir.cantidad_recibida),
          costoUnitario: Number(ir.costo_unitario),
          loteNumero: ir.lote_numero,
          fechaVencimiento: ir.fecha_vencimiento ? new Date(ir.fecha_vencimiento) : undefined,
        })
    );

    return new RecepcionCompra({
      id: r.id,
      ordenCompraId: r.orden_compra_id,
      proveedorId: r.proveedor_id,
      bodegaId: r.bodega_id,
      numero: r.numero,
      fecha: new Date(r.fecha),
      recibidoPor: r.recibido_por,
      notas: r.notas,
      items,
      createdAt: new Date(r.created_at),
    });
  }

  public async listRecepcionesByOrden(schemaName: string, ordenId: string): Promise<RecepcionCompra[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT * FROM "${s}".recepciones_compra WHERE orden_compra_id = $1 ORDER BY fecha DESC`,
      [ordenId]
    );
    return res.rows.map(
      (r) =>
        new RecepcionCompra({
          id: r.id,
          ordenCompraId: r.orden_compra_id,
          proveedorId: r.proveedor_id,
          bodegaId: r.bodega_id,
          numero: r.numero,
          fecha: new Date(r.fecha),
          recibidoPor: r.recibido_por,
          notas: r.notas,
          items: [],
          createdAt: new Date(r.created_at),
        })
    );
  }

  public async getNextNumeroRecepcion(schemaName: string): Promise<string> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT COUNT(*) as cnt FROM "${s}".recepciones_compra`);
    const nextVal = Number(res.rows[0].cnt) + 1;
    return `REC-${String(nextVal).padStart(5, '0')}`;
  }

  // ================= CUENTAS POR PAGAR =================
  public async createCuentaPorPagar(schemaName: string, c: CuentaPorPagar): Promise<CuentaPorPagar> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".cuentas_por_pagar (
        id, proveedor_id, proveedor_nombre, factura_proveedor_numero,
        orden_compra_id, recepcion_id, monto, saldo, fecha_emision, fecha_vencimiento, estado, notas, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        c.id,
        c.proveedorId,
        c.proveedorNombre || null,
        c.facturaProveedorNumero || null,
        c.ordenCompraId || null,
        c.recepcionId || null,
        c.monto,
        c.saldo,
        c.fechaEmision,
        c.fechaVencimiento || null,
        c.estado,
        c.notas || null,
        c.createdAt,
      ]
    );
    return c;
  }

  public async updateCuentaPorPagar(schemaName: string, id: string, data: Partial<CuentaPorPagarProps>): Promise<CuentaPorPagar> {
    const s = sanitizeSchema(schemaName);
    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, string> = {
      saldo: 'saldo',
      estado: 'estado',
      notas: 'notas',
      fechaVencimiento: 'fecha_vencimiento',
    };

    for (const [prop, col] of Object.entries(fields)) {
      if ((data as any)[prop] !== undefined) {
        setClauses.push(`${col} = $${p++}`);
        values.push((data as any)[prop]);
      }
    }

    if (setClauses.length > 0) {
      values.push(id);
      await dbPool.query(`UPDATE "${s}".cuentas_por_pagar SET ${setClauses.join(', ')} WHERE id = $${p}`, values);
    }

    return (await this.getCuentaById(schemaName, id))!;
  }

  public async getCuentaById(schemaName: string, id: string): Promise<CuentaPorPagar | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".cuentas_por_pagar WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new CuentaPorPagar({
      id: r.id,
      proveedorId: r.proveedor_id,
      proveedorNombre: r.proveedor_nombre,
      facturaProveedorNumero: r.factura_proveedor_numero,
      ordenCompraId: r.orden_compra_id,
      recepcionId: r.recepcion_id,
      monto: Number(r.monto),
      saldo: Number(r.saldo),
      fechaEmision: new Date(r.fecha_emision),
      fechaVencimiento: r.fecha_vencimiento ? new Date(r.fecha_vencimiento) : undefined,
      estado: r.estado as EstadoCuentaPorPagar,
      notas: r.notas,
      createdAt: new Date(r.created_at),
    });
  }

  public async listCuentasPorPagar(
    schemaName: string,
    filters?: { estado?: string; proveedorId?: string; vencidas?: boolean; page?: number; limit?: number }
  ): Promise<{ cuentas: CuentaPorPagar[]; total: number; page: number; totalPages: number }> {
    const s = sanitizeSchema(schemaName);
    const conditions: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (filters?.estado) {
      conditions.push(`estado = $${p++}`);
      values.push(filters.estado);
    }
    if (filters?.proveedorId) {
      conditions.push(`proveedor_id = $${p++}`);
      values.push(filters.proveedorId);
    }
    if (filters?.vencidas) {
      conditions.push(`fecha_vencimiento < CURRENT_DATE AND saldo > 0`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 25));
    const offset = (page - 1) * limit;

    const countParam = p++;
    const limitParam = p++;
    values.push(offset, limit);

    const query = `
      WITH filtered AS (
        SELECT * FROM "${s}".cuentas_por_pagar ${whereClause}
      )
      SELECT 
        (SELECT COUNT(*) FROM filtered) AS total_count,
        f.*
      FROM filtered f
      ORDER BY f.fecha_vencimiento ASC NULLS LAST
      OFFSET $${countParam} LIMIT $${limitParam}
    `;

    const res = await dbPool.query(query, values);
    const total = res.rows.length > 0 ? Number(res.rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    const cuentas = res.rows.map(
      (r) =>
        new CuentaPorPagar({
          id: r.id,
          proveedorId: r.proveedor_id,
          proveedorNombre: r.proveedor_nombre,
          facturaProveedorNumero: r.factura_proveedor_numero,
          ordenCompraId: r.orden_compra_id,
          recepcionId: r.recepcion_id,
          monto: Number(r.monto),
          saldo: Number(r.saldo),
          fechaEmision: new Date(r.fecha_emision),
          fechaVencimiento: r.fecha_vencimiento ? new Date(r.fecha_vencimiento) : undefined,
          estado: r.estado as EstadoCuentaPorPagar,
          notas: r.notas,
          createdAt: new Date(r.created_at),
        })
    );

    return { cuentas, total, page, totalPages };
  }

  public async registrarPagoCuenta(schemaName: string, cuentaId: string, monto: number, referencia?: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    const cuenta = await this.getCuentaById(schemaName, cuentaId);
    if (!cuenta) throw new Error(`Cuenta por pagar ${cuentaId} no encontrada.`);

    const nuevoSaldo = Math.max(0, cuenta.saldo - monto);
    const nuevoEstado: EstadoCuentaPorPagar = nuevoSaldo === 0 ? 'PAGADA' : 'PARCIAL';

    await dbPool.query(
      `UPDATE "${s}".cuentas_por_pagar 
       SET saldo = $1, estado = $2, notas = COALESCE(notas, '') || $3 
       WHERE id = $4`,
      [nuevoSaldo, nuevoEstado, referencia ? ` | Pago ref: ${referencia}` : '', cuentaId]
    );
  }
}

