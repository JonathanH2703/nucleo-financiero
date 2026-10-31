import { dbPool } from '../database/connection.js';
import { ISucursalRepository } from '../../domain/repositories/sucursal.repository.interface.js';
import { Sucursal, SucursalProps } from '../../domain/entities/sucursal.entity.js';

function sanitizeSchema(schemaName: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error(`Nombre de esquema no seguro: ${schemaName}`);
  }
  return schemaName;
}

export class PostgresSucursalRepository implements ISucursalRepository {
  public async createSucursal(schemaName: string, suc: Sucursal): Promise<Sucursal> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".sucursales (
        id, nombre, codigo, direccion, ciudad, departamento, telefono, responsable_id, pin_acceso, activa, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        suc.id,
        suc.nombre,
        suc.codigo,
        suc.direccion || null,
        suc.ciudad || 'Bogotá D.C.',
        suc.departamento || 'Cundinamarca',
        suc.telefono || null,
        suc.responsableId || null,
        suc.pinAcceso || null,
        suc.activa,
        suc.createdAt,
      ]
    );
    return suc;
  }

  public async updateSucursal(schemaName: string, id: string, data: Partial<SucursalProps>): Promise<Sucursal> {
    const s = sanitizeSchema(schemaName);
    const existing = await this.getSucursalById(schemaName, id);
    if (!existing) {
      throw new Error(`Sucursal con id ${id} no encontrada.`);
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, string> = {
      nombre: 'nombre',
      codigo: 'codigo',
      direccion: 'direccion',
      ciudad: 'ciudad',
      departamento: 'departamento',
      telefono: 'telefono',
      responsableId: 'responsable_id',
      pinAcceso: 'pin_acceso',
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
      UPDATE "${s}".sucursales
      SET ${setClauses.join(', ')}
      WHERE id = $${p}
      RETURNING *
    `;

    const res = await dbPool.query(query, values);
    return this.mapRow(res.rows[0]);
  }

  public async deleteSucursal(schemaName: string, id: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".sucursales SET activa = false WHERE id = $1`, [id]);
  }

  public async getSucursalById(schemaName: string, id: string): Promise<Sucursal | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".sucursales WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public async getSucursalByPin(schemaName: string, pin: string): Promise<Sucursal | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".sucursales WHERE pin_acceso = $1 AND activa = true LIMIT 1`, [pin]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public async listSucursales(schemaName: string): Promise<Sucursal[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".sucursales WHERE activa = true ORDER BY nombre ASC`);
    return res.rows.map((r) => this.mapRow(r));
  }

  private mapRow(r: any): Sucursal {
    return new Sucursal({
      id: r.id,
      nombre: r.nombre,
      codigo: r.codigo,
      direccion: r.direccion,
      ciudad: r.ciudad,
      departamento: r.departamento,
      telefono: r.telefono,
      responsableId: r.responsable_id,
      pinAcceso: r.pin_acceso,
      activa: Boolean(r.activa),
      createdAt: new Date(r.created_at),
    });
  }
}

