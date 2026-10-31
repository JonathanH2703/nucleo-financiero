import { dbPool } from '../database/connection.js';
import { IBodegaRepository } from '../../domain/repositories/bodega.repository.interface.js';
import { Bodega, BodegaProps } from '../../domain/entities/bodega.entity.js';
import { TipoBodega } from '../../domain/entities/tipos-comunes.js';

function sanitizeSchema(schemaName: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error(`Nombre de esquema no seguro: ${schemaName}`);
  }
  return schemaName;
}

export class PostgresBodegaRepository implements IBodegaRepository {
  public async createBodega(schemaName: string, bod: Bodega): Promise<Bodega> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".bodegas (
        id, sucursal_id, nombre, codigo, tipo, activa, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [bod.id, bod.sucursalId, bod.nombre, bod.codigo, bod.tipo, bod.activa, bod.createdAt]
    );
    return bod;
  }

  public async updateBodega(schemaName: string, id: string, data: Partial<BodegaProps>): Promise<Bodega> {
    const s = sanitizeSchema(schemaName);
    const existing = await this.getBodegaById(schemaName, id);
    if (!existing) {
      throw new Error(`Bodega con id ${id} no encontrada.`);
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, string> = {
      sucursalId: 'sucursal_id',
      nombre: 'nombre',
      codigo: 'codigo',
      tipo: 'tipo',
      activa: 'activa',
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
    const query = `
      UPDATE "${s}".bodegas
      SET ${setClauses.join(', ')}
      WHERE id = $${p}
      RETURNING *
    `;

    const res = await dbPool.query(query, values);
    return this.mapRow(res.rows[0]);
  }

  public async deleteBodega(schemaName: string, id: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".bodegas SET activa = false WHERE id = $1`, [id]);
  }

  public async getBodegaById(schemaName: string, id: string): Promise<Bodega | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".bodegas WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public async listBodegas(schemaName: string, sucursalId?: string): Promise<Bodega[]> {
    const s = sanitizeSchema(schemaName);
    let query = `SELECT * FROM "${s}".bodegas WHERE activa = true`;
    const params: any[] = [];

    if (sucursalId) {
      params.push(sucursalId);
      query += ` AND sucursal_id = $1`;
    }
    query += ` ORDER BY nombre ASC`;

    const res = await dbPool.query(query, params);
    return res.rows.map((r) => this.mapRow(r));
  }

  private mapRow(r: any): Bodega {
    return new Bodega({
      id: r.id,
      sucursalId: r.sucursal_id,
      nombre: r.nombre,
      codigo: r.codigo,
      tipo: r.tipo as TipoBodega,
      activa: Boolean(r.activa),
      createdAt: new Date(r.created_at),
    });
  }
}

