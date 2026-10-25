import { Request, Response, NextFunction } from 'express';
import { dbPool } from '../../../infrastructure/database/connection.js';

function sanitizeSchema(schema: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(schema)) {
    throw new Error(`Esquema no válido: ${schema}`);
  }
  return schema;
}

export class TercerosController {
  /**
   * GET /terceros
   * Listado de empresas, clientes y proveedores del tenant.
   */
  public static async listTerceros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const s = sanitizeSchema(tenant.schemaName);
      const { tipo, search, limit } = req.query;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (tipo === 'cliente') {
        conditions.push(`es_cliente = true`);
      } else if (tipo === 'proveedor') {
        conditions.push(`es_proveedor = true`);
      } else if (tipo === 'ambos') {
        conditions.push(`es_cliente = true AND es_proveedor = true`);
      }

      if (search && String(search).trim() !== '') {
        conditions.push(`(razon_social ILIKE $${paramIndex} OR numero_documento ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        values.push(`%${String(search).trim()}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limitVal = Math.min(Number(limit) || 100, 200);

      const query = `
        SELECT id, tipo_documento, numero_documento, razon_social, email, telefono, direccion, ciudad,
               es_cliente, es_proveedor, created_at
        FROM "${s}".terceros
        ${whereClause}
        ORDER BY razon_social ASC
        LIMIT ${limitVal}
      `;

      const result = await dbPool.query(query, values);

      res.status(200).json({
        success: true,
        count: result.rows.length,
        data: result.rows.map((r) => ({
          id: r.id,
          tipoDocumento: r.tipo_documento,
          numeroDocumento: r.numero_documento,
          razonSocial: r.razon_social,
          email: r.email,
          telefono: r.telefono,
          direccion: r.direccion,
          ciudad: r.ciudad,
          esCliente: r.es_cliente,
          esProveedor: r.es_proveedor,
          createdAt: r.created_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /terceros
   * Registro o actualización de una empresa (cliente, proveedor o ambos).
   */
  public static async createTercero(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const s = sanitizeSchema(tenant.schemaName);
      const {
        tipoDocumento,
        numeroDocumento,
        razonSocial,
        email,
        telefono,
        direccion,
        ciudad,
        esCliente,
        esProveedor,
      } = req.body;

      if (!numeroDocumento || !String(numeroDocumento).trim()) {
        res.status(400).json({ success: false, message: 'El número de documento o NIT es obligatorio' });
        return;
      }
      if (!razonSocial || !String(razonSocial).trim()) {
        res.status(400).json({ success: false, message: 'La razón social o nombre es obligatorio' });
        return;
      }

      const tipoDoc = tipoDocumento || 'NIT';
      const numDoc = String(numeroDocumento).trim();
      const rSocial = String(razonSocial).trim();
      const mail = email ? String(email).trim() : null;
      const tel = telefono ? String(telefono).trim() : null;
      const dir = direccion ? String(direccion).trim() : null;
      const city = ciudad ? String(ciudad).trim() : 'Bogotá D.C.';
      const isCliente = esCliente !== undefined ? Boolean(esCliente) : true;
      const isProveedor = esProveedor !== undefined ? Boolean(esProveedor) : false;

      // Upsert: si ya existe el NIT en el tenant, actualizar sus datos
      const upsertQuery = `
        INSERT INTO "${s}".terceros (
          tipo_documento, numero_documento, razon_social, email, telefono, direccion, ciudad, es_cliente, es_proveedor
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (numero_documento) DO UPDATE SET
          tipo_documento = EXCLUDED.tipo_documento,
          razon_social = EXCLUDED.razon_social,
          email = COALESCE(EXCLUDED.email, "${s}".terceros.email),
          telefono = COALESCE(EXCLUDED.telefono, "${s}".terceros.telefono),
          direccion = COALESCE(EXCLUDED.direccion, "${s}".terceros.direccion),
          ciudad = COALESCE(EXCLUDED.ciudad, "${s}".terceros.ciudad),
          es_cliente = "${s}".terceros.es_cliente OR EXCLUDED.es_cliente,
          es_proveedor = "${s}".terceros.es_proveedor OR EXCLUDED.es_proveedor
        RETURNING *
      `;

      const result = await dbPool.query(upsertQuery, [
        tipoDoc, numDoc, rSocial, mail, tel, dir, city, isCliente, isProveedor
      ]);

      const row = result.rows[0];

      res.status(201).json({
        success: true,
        message: 'Empresa / Tercero guardado exitosamente en la base de datos',
        data: {
          id: row.id,
          tipoDocumento: row.tipo_documento,
          numeroDocumento: row.numero_documento,
          razonSocial: row.razon_social,
          email: row.email,
          telefono: row.telefono,
          direccion: row.direccion,
          ciudad: row.ciudad,
          esCliente: row.es_cliente,
          esProveedor: row.es_proveedor,
          createdAt: row.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
