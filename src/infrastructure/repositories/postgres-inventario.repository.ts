import { dbPool } from '../database/connection.js';
import { IInventarioRepository } from '../../domain/repositories/inventario.repository.interface.js';
import {
  MovimientoInventario,
  LoteInventario,
  AjusteInventario,
  AjusteItem,
} from '../../domain/entities/inventario.entity.js';
import { TipoMovimientoInventario, EstadoAjusteInventario, TipoAjuste } from '../../domain/entities/tipos-comunes.js';

function sanitizeSchema(schemaName: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error(`Nombre de esquema no seguro: ${schemaName}`);
  }
  return schemaName;
}

export class PostgresInventarioRepository implements IInventarioRepository {
  // ================= MOVIMIENTOS & KARDEX =================
  public async registrarMovimiento(schemaName: string, mov: MovimientoInventario): Promise<MovimientoInventario> {
    const s = sanitizeSchema(schemaName);
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Obtener saldo actual en bodega
      const stockRes = await client.query(
        `SELECT cantidad FROM "${s}".stock_bodegas 
         WHERE producto_id = $1 AND (variante_id = $2 OR (variante_id IS NULL AND $2 IS NULL)) AND bodega_id = $3`,
        [mov.productoId, mov.varianteId || null, mov.bodegaId]
      );

      const saldoAnterior = stockRes.rows.length > 0 ? Number(stockRes.rows[0].cantidad) : 0;
      let saldoNuevo = saldoAnterior;

      // Calcular saldo según tipo de movimiento
      const tiposEntrada: TipoMovimientoInventario[] = ['ENTRADA', 'AJUSTE_POSITIVO', 'TRASLADO_ENTRADA', 'DEVOLUCION'];
      if (tiposEntrada.includes(mov.tipo)) {
        saldoNuevo = saldoAnterior + mov.cantidad;
      } else {
        saldoNuevo = saldoAnterior - mov.cantidad;
      }

      // 2. Insertar movimiento en Kardex
      await client.query(
        `INSERT INTO "${s}".movimientos_inventario (
          id, producto_id, variante_id, bodega_id, tipo, cantidad, costo_unitario,
          saldo_anterior, saldo_nuevo, lote_id, referencia_documento, referencia_tipo,
          notas, creado_por, fecha
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          mov.id,
          mov.productoId,
          mov.varianteId || null,
          mov.bodegaId,
          mov.tipo,
          mov.cantidad,
          mov.costoUnitario,
          saldoAnterior,
          saldoNuevo,
          mov.loteId || null,
          mov.referenciaDocumento || null,
          mov.referenciaTipo || null,
          mov.notas || null,
          mov.creadoPor || null,
          mov.fecha,
        ]
      );

      // 3. Upsert en stock_bodegas
      const stockId = `stk_${mov.productoId}_${mov.varianteId || 'base'}_${mov.bodegaId}`;
      await client.query(
        `INSERT INTO "${s}".stock_bodegas (id, producto_id, variante_id, bodega_id, cantidad, costo_promedio)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (producto_id, variante_id, bodega_id) DO UPDATE SET
           cantidad = EXCLUDED.cantidad,
           costo_promedio = CASE WHEN EXCLUDED.costo_promedio > 0 THEN EXCLUDED.costo_promedio ELSE "${s}".stock_bodegas.costo_promedio END`,
        [stockId, mov.productoId, mov.varianteId || null, mov.bodegaId, saldoNuevo, mov.costoUnitario]
      );

      // 4. Actualizar stock consolidado en tabla principal de productos
      const totalConsolidado = await client.query(
        `SELECT COALESCE(SUM(cantidad), 0) as total FROM "${s}".stock_bodegas WHERE producto_id = $1`,
        [mov.productoId]
      );
      await client.query(
        `UPDATE "${s}".productos SET stock_actual = $1, updated_at = NOW() WHERE id = $2`,
        [Number(totalConsolidado.rows[0].total), mov.productoId]
      );

      // 5. Si tiene lote asociado y es salida, descontar del lote
      if (mov.loteId && !tiposEntrada.includes(mov.tipo)) {
        await client.query(
          `UPDATE "${s}".lotes_inventario SET cantidad_disponible = GREATEST(0, cantidad_disponible - $1) WHERE id = $2`,
          [mov.cantidad, mov.loteId]
        );
      }

      await client.query('COMMIT');

      return new MovimientoInventario({
        id: mov.id,
        productoId: mov.productoId,
        varianteId: mov.varianteId,
        bodegaId: mov.bodegaId,
        tipo: mov.tipo,
        cantidad: mov.cantidad,
        costoUnitario: mov.costoUnitario,
        saldoAnterior,
        saldoNuevo,
        loteId: mov.loteId,
        referenciaDocumento: mov.referenciaDocumento,
        referenciaTipo: mov.referenciaTipo,
        notas: mov.notas,
        creadoPor: mov.creadoPor,
        fecha: mov.fecha,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async getKardex(
    schemaName: string,
    filters: {
      productoId?: string;
      varianteId?: string;
      bodegaId?: string;
      tipo?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ movimientos: MovimientoInventario[]; total: number; page: number; totalPages: number }> {
    const s = sanitizeSchema(schemaName);
    const conditions: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (filters.productoId) {
      conditions.push(`m.producto_id = $${p++}`);
      values.push(filters.productoId);
    }
    if (filters.varianteId) {
      conditions.push(`m.variante_id = $${p++}`);
      values.push(filters.varianteId);
    }
    if (filters.bodegaId) {
      conditions.push(`m.bodega_id = $${p++}`);
      values.push(filters.bodegaId);
    }
    if (filters.tipo) {
      conditions.push(`m.tipo = $${p++}`);
      values.push(filters.tipo);
    }
    if (filters.fechaDesde) {
      conditions.push(`m.fecha >= $${p++}::timestamptz`);
      values.push(filters.fechaDesde);
    }
    if (filters.fechaHasta) {
      conditions.push(`m.fecha <= $${p++}::timestamptz`);
      values.push(filters.fechaHasta);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const offset = (page - 1) * limit;

    const countParam = p++;
    const limitParam = p++;
    values.push(offset, limit);

    const query = `
      WITH filtered AS (
        SELECT m.* FROM "${s}".movimientos_inventario m ${whereClause}
      )
      SELECT 
        (SELECT COUNT(*) FROM filtered) AS total_count,
        f.*
      FROM filtered f
      ORDER BY f.fecha DESC
      OFFSET $${countParam} LIMIT $${limitParam}
    `;

    const res = await dbPool.query(query, values);
    const total = res.rows.length > 0 ? Number(res.rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      movimientos: res.rows.map((r) => this.mapMovimiento(r)),
      total,
      page,
      totalPages,
    };
  }

  // ================= STOCK =================
  public async getStockProducto(
    schemaName: string,
    productoId: string,
    bodegaId?: string
  ): Promise<{ bodegaId: string; bodegaNombre: string; varianteId?: string; cantidad: number; costoPromedio: number }[]> {
    const s = sanitizeSchema(schemaName);
    let query = `
      SELECT sb.bodega_id, b.nombre as bodega_nombre, sb.variante_id, sb.cantidad, sb.costo_promedio
      FROM "${s}".stock_bodegas sb
      JOIN "${s}".bodegas b ON sb.bodega_id = b.id
      WHERE sb.producto_id = $1
    `;
    const params: any[] = [productoId];
    if (bodegaId) {
      query += ` AND sb.bodega_id = $2`;
      params.push(bodegaId);
    }

    const res = await dbPool.query(query, params);
    return res.rows.map((r) => ({
      bodegaId: r.bodega_id,
      bodegaNombre: r.bodega_nombre,
      varianteId: r.variante_id,
      cantidad: Number(r.cantidad),
      costoPromedio: Number(r.costo_promedio),
    }));
  }

  public async getStockConsolidado(schemaName: string, productoId: string, varianteId?: string): Promise<number> {
    const s = sanitizeSchema(schemaName);
    let query = `SELECT COALESCE(SUM(cantidad), 0) as total FROM "${s}".stock_bodegas WHERE producto_id = $1`;
    const params: any[] = [productoId];
    if (varianteId) {
      query += ` AND variante_id = $2`;
      params.push(varianteId);
    }
    const res = await dbPool.query(query, params);
    return Number(res.rows[0].total);
  }

  public async getProductosStockBajo(
    schemaName: string,
    bodegaId?: string
  ): Promise<
    {
      productoId: string;
      productoNombre: string;
      stockActual: number;
      stockMinimo: number;
      bodegaId?: string;
      bodegaNombre?: string;
    }[]
  > {
    const s = sanitizeSchema(schemaName);
    let query = `
      SELECT p.id as producto_id, p.nombre as producto_nombre, p.stock_minimo,
             COALESCE(sb.cantidad, p.stock_actual) as stock_actual,
             b.id as bodega_id, b.nombre as bodega_nombre
      FROM "${s}".productos p
      LEFT JOIN "${s}".stock_bodegas sb ON p.id = sb.producto_id
      LEFT JOIN "${s}".bodegas b ON sb.bodega_id = b.id
      WHERE p.activo = true AND COALESCE(sb.cantidad, p.stock_actual) <= p.stock_minimo
    `;
    const params: any[] = [];
    if (bodegaId) {
      query += ` AND sb.bodega_id = $1`;
      params.push(bodegaId);
    }
    query += ` ORDER BY stock_actual ASC`;

    const res = await dbPool.query(query, params);
    return res.rows.map((r) => ({
      productoId: r.producto_id,
      productoNombre: r.producto_nombre,
      stockActual: Number(r.stock_actual),
      stockMinimo: Number(r.stock_minimo),
      bodegaId: r.bodega_id,
      bodegaNombre: r.bodega_nombre,
    }));
  }

  public async actualizarStock(
    schemaName: string,
    params: {
      productoId: string;
      bodegaId: string;
      varianteId?: string;
      deltaCantidad: number;
      costoUnitario?: number;
    }
  ): Promise<{ stockNuevo: number; stockAnterior: number }> {
    const s = sanitizeSchema(schemaName);
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      const current = await client.query(
        `SELECT cantidad FROM "${s}".stock_bodegas 
         WHERE producto_id = $1 AND (variante_id = $2 OR (variante_id IS NULL AND $2 IS NULL)) AND bodega_id = $3`,
        [params.productoId, params.varianteId || null, params.bodegaId]
      );

      const stockAnterior = current.rows.length > 0 ? Number(current.rows[0].cantidad) : 0;
      const stockNuevo = stockAnterior + params.deltaCantidad;

      const stockId = `stk_${params.productoId}_${params.varianteId || 'base'}_${params.bodegaId}`;
      await client.query(
        `INSERT INTO "${s}".stock_bodegas (id, producto_id, variante_id, bodega_id, cantidad, costo_promedio)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (producto_id, variante_id, bodega_id) DO UPDATE SET
           cantidad = EXCLUDED.cantidad,
           costo_promedio = COALESCE(EXCLUDED.costo_promedio, "${s}".stock_bodegas.costo_promedio)`,
        [stockId, params.productoId, params.varianteId || null, params.bodegaId, stockNuevo, params.costoUnitario || 0]
      );

      // Consolidado
      const totalConsolidado = await client.query(
        `SELECT COALESCE(SUM(cantidad), 0) as total FROM "${s}".stock_bodegas WHERE producto_id = $1`,
        [params.productoId]
      );
      await client.query(`UPDATE "${s}".productos SET stock_actual = $1, updated_at = NOW() WHERE id = $2`, [
        Number(totalConsolidado.rows[0].total),
        params.productoId,
      ]);

      await client.query('COMMIT');
      return { stockNuevo, stockAnterior };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ================= AJUSTES =================
  public async crearAjuste(schemaName: string, a: AjusteInventario): Promise<AjusteInventario> {
    const s = sanitizeSchema(schemaName);
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO "${s}".ajustes_inventario (id, bodega_id, numero, tipo, observaciones, estado, creado_por, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [a.id, a.bodegaId, a.numero, a.tipo, a.observaciones || null, a.estado, a.creadoPor || null, a.createdAt]
      );

      for (const item of a.items) {
        await client.query(
          `INSERT INTO "${s}".ajuste_items (id, ajuste_id, producto_id, variante_id, cantidad_sistema, cantidad_fisica, diferencia, costo_unitario)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            item.id,
            a.id,
            item.productoId,
            item.varianteId || null,
            item.cantidadSistema,
            item.cantidadFisica,
            item.diferencia,
            item.costoUnitario,
          ]
        );
      }

      await client.query('COMMIT');
      return a;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async confirmarAjuste(schemaName: string, ajusteId: string, aprobadoPor: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    const ajuste = await this.getAjusteById(schemaName, ajusteId);
    if (!ajuste) throw new Error(`Ajuste ${ajusteId} no encontrado.`);
    if (ajuste.estado !== 'PENDIENTE') throw new Error(`El ajuste no se encuentra en estado PENDIENTE.`);

    for (const item of ajuste.items) {
      if (item.diferencia !== 0) {
        const tipoMov: TipoMovimientoInventario = item.diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';
        const cantidadAbs = Math.abs(item.diferencia);

        await this.registrarMovimiento(
          schemaName,
          new MovimientoInventario({
            id: `mov_ajuste_${item.id}`,
            productoId: item.productoId,
            varianteId: item.varianteId,
            bodegaId: ajuste.bodegaId,
            tipo: tipoMov,
            cantidad: cantidadAbs,
            costoUnitario: item.costoUnitario,
            saldoAnterior: item.cantidadSistema,
            saldoNuevo: item.cantidadFisica,
            referenciaDocumento: ajuste.numero,
            referenciaTipo: 'AJUSTE',
            notas: `Ajuste confirmado: ${ajuste.observaciones || ''}`,
            creadoPor: aprobadoPor,
          })
        );
      }
    }

    await dbPool.query(
      `UPDATE "${s}".ajustes_inventario SET estado = 'CONFIRMADO', aprobado_por = $1 WHERE id = $2`,
      [aprobadoPor, ajusteId]
    );
  }

  public async revertirAjuste(schemaName: string, ajusteId: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    const ajuste = await this.getAjusteById(schemaName, ajusteId);
    if (!ajuste) throw new Error(`Ajuste ${ajusteId} no encontrado.`);
    if (ajuste.estado !== 'CONFIRMADO') throw new Error(`Solo se puede revertir un ajuste CONFIRMADO.`);

    for (const item of ajuste.items) {
      if (item.diferencia !== 0) {
        // Revertir: si fue positivo ahora es negativo
        const tipoReverso: TipoMovimientoInventario = item.diferencia > 0 ? 'AJUSTE_NEGATIVO' : 'AJUSTE_POSITIVO';
        const cantidadAbs = Math.abs(item.diferencia);

        await this.registrarMovimiento(
          schemaName,
          new MovimientoInventario({
            id: `mov_rev_ajuste_${item.id}`,
            productoId: item.productoId,
            varianteId: item.varianteId,
            bodegaId: ajuste.bodegaId,
            tipo: tipoReverso,
            cantidad: cantidadAbs,
            costoUnitario: item.costoUnitario,
            saldoAnterior: item.cantidadFisica,
            saldoNuevo: item.cantidadSistema,
            referenciaDocumento: `${ajuste.numero}-REV`,
            referenciaTipo: 'AJUSTE_REVERTIDO',
            notas: `Reversión de ajuste ${ajuste.numero}`,
            creadoPor: 'sistema',
          })
        );
      }
    }

    await dbPool.query(`UPDATE "${s}".ajustes_inventario SET estado = 'REVERTIDO' WHERE id = $1`, [ajusteId]);
  }

  public async getAjusteById(schemaName: string, id: string): Promise<AjusteInventario | null> {
    const s = sanitizeSchema(schemaName);
    const aRes = await dbPool.query(`SELECT * FROM "${s}".ajustes_inventario WHERE id = $1`, [id]);
    if (aRes.rows.length === 0) return null;
    const r = aRes.rows[0];

    const itemsRes = await dbPool.query(`SELECT * FROM "${s}".ajuste_items WHERE ajuste_id = $1`, [id]);
    const items = itemsRes.rows.map(
      (ir) =>
        new AjusteItem({
          id: ir.id,
          ajusteId: ir.ajuste_id,
          productoId: ir.producto_id,
          varianteId: ir.variante_id,
          cantidadSistema: Number(ir.cantidad_sistema),
          cantidadFisica: Number(ir.cantidad_fisica),
          diferencia: Number(ir.diferencia),
          costoUnitario: Number(ir.costo_unitario),
        })
    );

    return new AjusteInventario({
      id: r.id,
      bodegaId: r.bodega_id,
      numero: r.numero,
      tipo: r.tipo as TipoAjuste,
      observaciones: r.observaciones,
      estado: r.estado as EstadoAjusteInventario,
      creadoPor: r.creado_por,
      aprobadoPor: r.aprobado_por,
      items,
      createdAt: new Date(r.created_at),
    });
  }

  public async listAjustes(
    schemaName: string,
    filters?: { bodegaId?: string; estado?: string; page?: number; limit?: number }
  ): Promise<{ ajustes: AjusteInventario[]; total: number; page: number; totalPages: number }> {
    const s = sanitizeSchema(schemaName);
    const conditions: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (filters?.bodegaId) {
      conditions.push(`bodega_id = $${p++}`);
      values.push(filters.bodegaId);
    }
    if (filters?.estado) {
      conditions.push(`estado = $${p++}`);
      values.push(filters.estado);
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
        SELECT * FROM "${s}".ajustes_inventario ${whereClause}
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

    const ajustes: AjusteInventario[] = [];
    for (const r of res.rows) {
      const itemsRes = await dbPool.query(`SELECT * FROM "${s}".ajuste_items WHERE ajuste_id = $1`, [r.id]);
      const items = itemsRes.rows.map(
        (ir) =>
          new AjusteItem({
            id: ir.id,
            ajusteId: ir.ajuste_id,
            productoId: ir.producto_id,
            varianteId: ir.variante_id,
            cantidadSistema: Number(ir.cantidad_sistema),
            cantidadFisica: Number(ir.cantidad_fisica),
            diferencia: Number(ir.diferencia),
            costoUnitario: Number(ir.costo_unitario),
          })
      );

      ajustes.push(
        new AjusteInventario({
          id: r.id,
          bodegaId: r.bodega_id,
          numero: r.numero,
          tipo: r.tipo as TipoAjuste,
          observaciones: r.observaciones,
          estado: r.estado as EstadoAjusteInventario,
          creadoPor: r.creado_por,
          aprobadoPor: r.aprobado_por,
          items,
          createdAt: new Date(r.created_at),
        })
      );
    }

    return { ajustes, total, page, totalPages };
  }

  // ================= LOTES =================
  public async crearLote(schemaName: string, lote: LoteInventario): Promise<LoteInventario> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".lotes_inventario (
        id, producto_id, variante_id, bodega_id, numero_lote,
        fecha_vencimiento, fecha_ingreso, cantidad_inicial, cantidad_disponible, costo_unitario, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        lote.id,
        lote.productoId,
        lote.varianteId || null,
        lote.bodegaId,
        lote.numeroLote,
        lote.fechaVencimiento || null,
        lote.fechaIngreso,
        lote.cantidadInicial,
        lote.cantidadDisponible,
        lote.costoUnitario,
        lote.activo,
      ]
    );
    return lote;
  }

  public async getLotesByProducto(schemaName: string, productoId: string, bodegaId?: string): Promise<LoteInventario[]> {
    const s = sanitizeSchema(schemaName);
    let query = `SELECT * FROM "${s}".lotes_inventario WHERE producto_id = $1 AND activo = true AND cantidad_disponible > 0`;
    const params: any[] = [productoId];
    if (bodegaId) {
      query += ` AND bodega_id = $2`;
      params.push(bodegaId);
    }
    query += ` ORDER BY fecha_vencimiento ASC NULLS LAST`;

    const res = await dbPool.query(query, params);
    return res.rows.map((r) => this.mapLote(r));
  }

  public async getLotesProximosVencer(schemaName: string, diasAnticipacion: number): Promise<LoteInventario[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT * FROM "${s}".lotes_inventario 
       WHERE activo = true AND cantidad_disponible > 0 
         AND fecha_vencimiento IS NOT NULL 
         AND fecha_vencimiento <= (CURRENT_DATE + ($1 || ' days')::INTERVAL)
       ORDER BY fecha_vencimiento ASC`,
      [diasAnticipacion]
    );
    return res.rows.map((r) => this.mapLote(r));
  }

  public async actualizarCantidadLote(schemaName: string, loteId: string, nuevaCantidad: number): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `UPDATE "${s}".lotes_inventario SET cantidad_disponible = $1, activo = ($1 > 0) WHERE id = $2`,
      [nuevaCantidad, loteId]
    );
  }

  // ================= HELPERS =================
  private mapMovimiento(r: any): MovimientoInventario {
    return new MovimientoInventario({
      id: r.id,
      productoId: r.producto_id,
      varianteId: r.variante_id,
      bodegaId: r.bodega_id,
      tipo: r.tipo as TipoMovimientoInventario,
      cantidad: Number(r.cantidad),
      costoUnitario: Number(r.costo_unitario),
      saldoAnterior: Number(r.saldo_anterior),
      saldoNuevo: Number(r.saldo_nuevo),
      loteId: r.lote_id,
      referenciaDocumento: r.referencia_documento,
      referenciaTipo: r.referencia_tipo,
      notas: r.notas,
      creadoPor: r.creado_por,
      fecha: new Date(r.fecha),
    });
  }

  private mapLote(r: any): LoteInventario {
    return new LoteInventario({
      id: r.id,
      productoId: r.producto_id,
      varianteId: r.variante_id,
      bodegaId: r.bodega_id,
      numeroLote: r.numero_lote,
      fechaVencimiento: r.fecha_vencimiento ? new Date(r.fecha_vencimiento) : undefined,
      fechaIngreso: new Date(r.fecha_ingreso),
      cantidadInicial: Number(r.cantidad_inicial),
      cantidadDisponible: Number(r.cantidad_disponible),
      costoUnitario: Number(r.costo_unitario),
      activo: Boolean(r.activo),
    });
  }
}

