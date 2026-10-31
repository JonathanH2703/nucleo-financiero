import { dbPool } from '../database/connection.js';
import { ITerceroRepository } from '../../domain/repositories/tercero.repository.interface.js';
import { Tercero, TerceroProps } from '../../domain/entities/tercero.entity.js';

function sanitizeSchema(schemaName: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error(`Nombre de esquema no seguro: ${schemaName}`);
  }
  return schemaName;
}

export class PostgresTerceroRepository implements ITerceroRepository {
  public async create(schemaName: string, t: Tercero): Promise<Tercero> {
    const s = sanitizeSchema(schemaName);
    const query = `
      INSERT INTO "${s}".terceros (
        id, tipo_documento, numero_documento, razon_social, nombre_comercial,
        email, telefono, direccion, ciudad, departamento, tipo_contribuyente,
        responsabilidades_rut, aplica_retefuente, tarifa_retefuente,
        aplica_reteica, tarifa_reteica, aplica_reteiva, banco, tipo_cuenta,
        numero_cuenta, contacto_nombre, contacto_cargo, contacto_celular,
        plazo_pago_dias, descuento_pronto_pago, cupo_credito,
        es_cliente, es_proveedor, activo, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31
      )
      ON CONFLICT (numero_documento) DO UPDATE SET
        tipo_documento = EXCLUDED.tipo_documento,
        razon_social = EXCLUDED.razon_social,
        nombre_comercial = COALESCE(EXCLUDED.nombre_comercial, "${s}".terceros.nombre_comercial),
        email = COALESCE(EXCLUDED.email, "${s}".terceros.email),
        telefono = COALESCE(EXCLUDED.telefono, "${s}".terceros.telefono),
        direccion = COALESCE(EXCLUDED.direccion, "${s}".terceros.direccion),
        ciudad = COALESCE(EXCLUDED.ciudad, "${s}".terceros.ciudad),
        departamento = COALESCE(EXCLUDED.departamento, "${s}".terceros.departamento),
        tipo_contribuyente = COALESCE(EXCLUDED.tipo_contribuyente, "${s}".terceros.tipo_contribuyente),
        responsabilidades_rut = COALESCE(EXCLUDED.responsabilidades_rut, "${s}".terceros.responsabilidades_rut),
        aplica_retefuente = EXCLUDED.aplica_retefuente,
        tarifa_retefuente = EXCLUDED.tarifa_retefuente,
        aplica_reteica = EXCLUDED.aplica_reteica,
        tarifa_reteica = EXCLUDED.tarifa_reteica,
        aplica_reteiva = EXCLUDED.aplica_reteiva,
        banco = COALESCE(EXCLUDED.banco, "${s}".terceros.banco),
        tipo_cuenta = COALESCE(EXCLUDED.tipo_cuenta, "${s}".terceros.tipo_cuenta),
        numero_cuenta = COALESCE(EXCLUDED.numero_cuenta, "${s}".terceros.numero_cuenta),
        contacto_nombre = COALESCE(EXCLUDED.contacto_nombre, "${s}".terceros.contacto_nombre),
        contacto_cargo = COALESCE(EXCLUDED.contacto_cargo, "${s}".terceros.contacto_cargo),
        contacto_celular = COALESCE(EXCLUDED.contacto_celular, "${s}".terceros.contacto_celular),
        plazo_pago_dias = EXCLUDED.plazo_pago_dias,
        descuento_pronto_pago = EXCLUDED.descuento_pronto_pago,
        cupo_credito = EXCLUDED.cupo_credito,
        es_cliente = "${s}".terceros.es_cliente OR EXCLUDED.es_cliente,
        es_proveedor = "${s}".terceros.es_proveedor OR EXCLUDED.es_proveedor,
        activo = true,
        updated_at = NOW()
      RETURNING *
    `;

    const res = await dbPool.query(query, [
      t.id,
      t.tipoDocumento,
      t.numeroDocumento,
      t.razonSocial,
      t.nombreComercial || null,
      t.email || null,
      t.telefono || null,
      t.direccion || null,
      t.ciudad || 'Bogotá D.C.',
      t.departamento || 'Cundinamarca',
      t.tipoContribuyente || null,
      t.responsabilidadesRUT ? JSON.stringify(t.responsabilidadesRUT) : null,
      t.aplicaReteFuente,
      t.tarifaReteFuente,
      t.aplicaReteICA,
      t.tarifaReteICA,
      t.aplicaReteIVA,
      t.banco || null,
      t.tipoCuenta || null,
      t.numeroCuenta || null,
      t.contactoNombre || null,
      t.contactoCargo || null,
      t.contactoCelular || null,
      t.plazoPagoDias,
      t.descuentoProntoPago,
      t.cupoCredito,
      t.esCliente,
      t.esProveedor,
      t.activo,
      t.createdAt,
      t.updatedAt,
    ]);

    return this.mapRow(res.rows[0]);
  }

  public async update(schemaName: string, id: string, data: Partial<TerceroProps>): Promise<Tercero> {
    const s = sanitizeSchema(schemaName);
    const existing = await this.getById(schemaName, id);
    if (!existing) {
      throw new Error(`Tercero con id ${id} no encontrado.`);
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, string> = {
      tipoDocumento: 'tipo_documento',
      numeroDocumento: 'numero_documento',
      razonSocial: 'razon_social',
      nombreComercial: 'nombre_comercial',
      email: 'email',
      telefono: 'telefono',
      direccion: 'direccion',
      ciudad: 'ciudad',
      departamento: 'departamento',
      tipoContribuyente: 'tipo_contribuyente',
      responsabilidadesRUT: 'responsabilidades_rut',
      aplicaReteFuente: 'aplica_retefuente',
      tarifaReteFuente: 'tarifa_retefuente',
      aplicaReteICA: 'aplica_reteica',
      tarifaReteICA: 'tarifa_reteica',
      aplicaReteIVA: 'aplica_reteiva',
      banco: 'banco',
      tipoCuenta: 'tipo_cuenta',
      numeroCuenta: 'numero_cuenta',
      contactoNombre: 'contacto_nombre',
      contactoCargo: 'contacto_cargo',
      contactoCelular: 'contacto_celular',
      plazoPagoDias: 'plazo_pago_dias',
      descuentoProntoPago: 'descuento_pronto_pago',
      cupoCredito: 'cupo_credito',
      esCliente: 'es_cliente',
      esProveedor: 'es_proveedor',
      activo: 'activo',
    };

    for (const [prop, col] of Object.entries(fields)) {
      if ((data as any)[prop] !== undefined) {
        let val = (data as any)[prop];
        if (prop === 'responsabilidadesRUT' && Array.isArray(val)) {
          val = JSON.stringify(val);
        }
        setClauses.push(`${col} = $${p}`);
        values.push(val);
        p++;
      }
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE "${s}".terceros
      SET ${setClauses.join(', ')}
      WHERE id = $${p}
      RETURNING *
    `;

    const res = await dbPool.query(query, values);
    return this.mapRow(res.rows[0]);
  }

  public async delete(schemaName: string, id: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(`UPDATE "${s}".terceros SET activo = false, updated_at = NOW() WHERE id = $1`, [id]);
  }

  public async getById(schemaName: string, id: string): Promise<Tercero | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".terceros WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public async getByDocumento(schemaName: string, numeroDocumento: string): Promise<Tercero | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".terceros WHERE numero_documento = $1`, [numeroDocumento]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public async list(
    schemaName: string,
    filters?: {
      tipo?: 'cliente' | 'proveedor' | 'ambos' | string;
      search?: string;
      activo?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ terceros: Tercero[]; total: number; page: number; totalPages: number }> {
    const s = sanitizeSchema(schemaName);
    const conditions: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (filters?.activo !== undefined) {
      conditions.push(`activo = $${p}`);
      values.push(filters.activo);
      p++;
    } else {
      conditions.push(`activo = true`);
    }

    if (filters?.tipo === 'cliente') {
      conditions.push(`es_cliente = true`);
    } else if (filters?.tipo === 'proveedor') {
      conditions.push(`es_proveedor = true`);
    } else if (filters?.tipo === 'ambos') {
      conditions.push(`es_cliente = true AND es_proveedor = true`);
    }

    if (filters?.search && filters.search.trim() !== '') {
      conditions.push(
        `(razon_social ILIKE $${p} OR numero_documento ILIKE $${p} OR email ILIKE $${p} OR nombre_comercial ILIKE $${p})`
      );
      values.push(`%${filters.search.trim()}%`);
      p++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 25));
    const offset = (page - 1) * limit;

    const countParam = p;
    const limitParam = p + 1;
    values.push(offset, limit);

    const query = `
      WITH filtered AS (
        SELECT * FROM "${s}".terceros ${whereClause}
      )
      SELECT 
        (SELECT COUNT(*) FROM filtered) AS total_count,
        f.*
      FROM filtered f
      ORDER BY f.razon_social ASC
      OFFSET $${countParam} LIMIT $${limitParam}
    `;

    const res = await dbPool.query(query, values);
    const total = res.rows.length > 0 ? Number(res.rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      terceros: res.rows.map((r) => this.mapRow(r)),
      total,
      page,
      totalPages,
    };
  }

  private mapRow(r: any): Tercero {
    let rut: string[] = [];
    if (r.responsabilidades_rut) {
      try {
        rut = typeof r.responsabilidades_rut === 'string' ? JSON.parse(r.responsabilidades_rut) : r.responsabilidades_rut;
      } catch {
        rut = [];
      }
    }

    return new Tercero({
      id: r.id,
      tipoDocumento: r.tipo_documento,
      numeroDocumento: r.numero_documento,
      razonSocial: r.razon_social,
      nombreComercial: r.nombre_comercial,
      email: r.email,
      telefono: r.telefono,
      direccion: r.direccion,
      ciudad: r.ciudad,
      departamento: r.departamento,
      tipoContribuyente: r.tipo_contribuyente,
      responsabilidadesRUT: rut,
      aplicaReteFuente: Boolean(r.aplica_retefuente),
      tarifaReteFuente: Number(r.tarifa_retefuente || 0),
      aplicaReteICA: Boolean(r.aplica_reteica),
      tarifaReteICA: Number(r.tarifa_reteica || 0),
      aplicaReteIVA: Boolean(r.aplica_reteiva),
      banco: r.banco,
      tipoCuenta: r.tipo_cuenta,
      numeroCuenta: r.numero_cuenta,
      contactoNombre: r.contacto_nombre,
      contactoCargo: r.contacto_cargo,
      contactoCelular: r.contacto_celular,
      plazoPagoDias: Number(r.plazo_pago_dias || 0),
      descuentoProntoPago: Number(r.descuento_pronto_pago || 0),
      cupoCredito: Number(r.cupo_credito || 0),
      esCliente: Boolean(r.es_cliente),
      esProveedor: Boolean(r.es_proveedor),
      activo: Boolean(r.activo),
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    });
  }
}

