import { dbPool } from '../database/connection.js';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface.js';
import { Permiso, Rol, Usuario, ModuloPermiso } from '../../domain/entities/auth.entity.js';

function sanitizeSchema(schemaName: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error(`Nombre de esquema no seguro: ${schemaName}`);
  }
  return schemaName;
}

export class PostgresAuthRepository implements IAuthRepository {
  public async listPermisos(schemaName: string, modulo?: ModuloPermiso): Promise<Permiso[]> {
    const s = sanitizeSchema(schemaName);
    let query = `SELECT * FROM "${s}".permisos`;
    const params: any[] = [];
    if (modulo) {
      params.push(modulo);
      query += ` WHERE modulo = $1`;
    }
    query += ` ORDER BY modulo ASC, codigo ASC`;

    const res = await dbPool.query(query, params);
    return res.rows.map((r) => new Permiso({
      id: r.id,
      modulo: r.modulo as ModuloPermiso,
      codigo: r.codigo,
      nombre: r.nombre,
      descripcion: r.descripcion,
    }));
  }

  public async listRoles(schemaName: string): Promise<Rol[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".roles WHERE activo = true ORDER BY es_sistema DESC, nombre ASC`);
    const roles: Rol[] = [];

    for (const r of res.rows) {
      const pRes = await dbPool.query(
        `SELECT p.* FROM "${s}".permisos p
         JOIN "${s}".rol_permisos rp ON p.id = rp.permiso_id
         WHERE rp.rol_id = $1`,
        [r.id]
      );
      const permisos = pRes.rows.map((pr) => new Permiso({
        id: pr.id,
        modulo: pr.modulo as ModuloPermiso,
        codigo: pr.codigo,
        nombre: pr.nombre,
        descripcion: pr.descripcion,
      }));

      roles.push(new Rol({
        id: r.id,
        nombre: r.nombre,
        slug: r.slug,
        descripcion: r.descripcion,
        esSistema: r.es_sistema,
        activo: r.activo,
        permisos,
        createdAt: new Date(r.created_at),
      }));
    }

    return roles;
  }

  public async getRolById(schemaName: string, id: string): Promise<Rol | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(`SELECT * FROM "${s}".roles WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    const pRes = await dbPool.query(
      `SELECT p.* FROM "${s}".permisos p
       JOIN "${s}".rol_permisos rp ON p.id = rp.permiso_id
       WHERE rp.rol_id = $1`,
      [id]
    );
    const permisos = pRes.rows.map((pr) => new Permiso({
      id: pr.id,
      modulo: pr.modulo as ModuloPermiso,
      codigo: pr.codigo,
      nombre: pr.nombre,
      descripcion: pr.descripcion,
    }));

    return new Rol({
      id: r.id,
      nombre: r.nombre,
      slug: r.slug,
      descripcion: r.descripcion,
      esSistema: r.es_sistema,
      activo: r.activo,
      permisos,
      createdAt: new Date(r.created_at),
    });
  }

  public async createRol(schemaName: string, rol: Rol, permisoIds: string[]): Promise<Rol> {
    const s = sanitizeSchema(schemaName);
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO "${s}".roles (id, nombre, slug, descripcion, es_sistema, activo, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [rol.id, rol.nombre, rol.slug, rol.descripcion || null, rol.esSistema, rol.activo, rol.createdAt]
      );

      for (const pId of permisoIds) {
        await client.query(
          `INSERT INTO "${s}".rol_permisos (rol_id, permiso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [rol.id, pId]
        );
      }

      await client.query('COMMIT');
      return rol;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async updateRol(
    schemaName: string,
    id: string,
    datos: { nombre?: string; descripcion?: string; activo?: boolean }
  ): Promise<Rol> {
    const s = sanitizeSchema(schemaName);
    const existing = await this.getRolById(schemaName, id);
    if (!existing) throw new Error(`Rol no encontrado con ID: ${id}`);

    const nombre = datos.nombre ?? existing.nombre;
    const descripcion = datos.descripcion ?? existing.descripcion;
    const activo = datos.activo ?? existing.activo;

    await dbPool.query(
      `UPDATE "${s}".roles SET nombre = $1, descripcion = $2, activo = $3 WHERE id = $4`,
      [nombre, descripcion, activo, id]
    );

    const updated = await this.getRolById(schemaName, id);
    return updated!;
  }

  public async deleteRol(schemaName: string, id: string): Promise<void> {
    const s = sanitizeSchema(schemaName);
    const rol = await this.getRolById(schemaName, id);
    if (!rol) throw new Error(`Rol no encontrado con ID: ${id}`);
    if (rol.esSistema) throw new Error('No es posible eliminar roles base del sistema');

    // Desactivar lógicamente para preservar integridad histórica
    await dbPool.query(`UPDATE "${s}".roles SET activo = false WHERE id = $1`, [id]);
  }

  public async asignarPermisosARol(schemaName: string, rolId: string, permisoIds: string[]): Promise<void> {
    const s = sanitizeSchema(schemaName);
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM "${s}".rol_permisos WHERE rol_id = $1`, [rolId]);

      for (const pId of permisoIds) {
        await client.query(
          `INSERT INTO "${s}".rol_permisos (rol_id, permiso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [rolId, pId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async listUsuarios(schemaName: string): Promise<Usuario[]> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT u.*, r.nombre as rol_nombre, r.slug as rol_slug 
       FROM "${s}".usuarios u
       JOIN "${s}".roles r ON u.rol_id = r.id
       WHERE u.activo = true
       ORDER BY u.nombre ASC`
    );

    const usuarios: Usuario[] = [];
    for (const r of res.rows) {
      const pRes = await dbPool.query(
        `SELECT p.codigo FROM "${s}".permisos p
         JOIN "${s}".rol_permisos rp ON p.id = rp.permiso_id
         WHERE rp.rol_id = $1`,
        [r.rol_id]
      );
      const permisos = pRes.rows.map((pr) => pr.codigo);

      usuarios.push(new Usuario({
        id: r.id,
        nombre: r.nombre,
        email: r.email,
        pinSeguridad: r.pin_seguridad,
        rolId: r.rol_id,
        rolNombre: r.rol_nombre,
        rolSlug: r.rol_slug,
        permisos,
        areaAsignadaId: r.area_asignada_id,
        activo: r.activo,
        createdAt: new Date(r.created_at),
      }));
    }
    return usuarios;
  }

  public async getUsuarioById(schemaName: string, id: string): Promise<Usuario | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT u.*, r.nombre as rol_nombre, r.slug as rol_slug 
       FROM "${s}".usuarios u
       JOIN "${s}".roles r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    const pRes = await dbPool.query(
      `SELECT p.codigo FROM "${s}".permisos p
       JOIN "${s}".rol_permisos rp ON p.id = rp.permiso_id
       WHERE rp.rol_id = $1`,
      [r.rol_id]
    );
    const permisos = pRes.rows.map((pr) => pr.codigo);

    return new Usuario({
      id: r.id,
      nombre: r.nombre,
      email: r.email,
      pinSeguridad: r.pin_seguridad,
      rolId: r.rol_id,
      rolNombre: r.rol_nombre,
      rolSlug: r.rol_slug,
      permisos,
      areaAsignadaId: r.area_asignada_id,
      activo: r.activo,
      createdAt: new Date(r.created_at),
    });
  }

  public async autenticarPorPin(schemaName: string, pin: string): Promise<Usuario | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT u.*, r.nombre as rol_nombre, r.slug as rol_slug 
       FROM "${s}".usuarios u
       JOIN "${s}".roles r ON u.rol_id = r.id
       WHERE u.pin_seguridad = $1 AND u.activo = true`,
      [pin]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    const pRes = await dbPool.query(
      `SELECT p.codigo FROM "${s}".permisos p
       JOIN "${s}".rol_permisos rp ON p.id = rp.permiso_id
       WHERE rp.rol_id = $1`,
      [r.rol_id]
    );
    const permisos = pRes.rows.map((pr) => pr.codigo);

    return new Usuario({
      id: r.id,
      nombre: r.nombre,
      email: r.email,
      pinSeguridad: r.pin_seguridad,
      rolId: r.rol_id,
      rolNombre: r.rol_nombre,
      rolSlug: r.rol_slug,
      permisos,
      areaAsignadaId: r.area_asignada_id,
      activo: r.activo,
      createdAt: new Date(r.created_at),
    });
  }

  public async autenticarPorEmail(schemaName: string, email: string): Promise<Usuario | null> {
    const s = sanitizeSchema(schemaName);
    const res = await dbPool.query(
      `SELECT u.*, r.nombre as rol_nombre, r.slug as rol_slug 
       FROM "${s}".usuarios u
       JOIN "${s}".roles r ON u.rol_id = r.id
       WHERE LOWER(u.email) = LOWER($1) AND u.activo = true`,
      [email]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    const pRes = await dbPool.query(
      `SELECT p.codigo FROM "${s}".permisos p
       JOIN "${s}".rol_permisos rp ON p.id = rp.permiso_id
       WHERE rp.rol_id = $1`,
      [r.rol_id]
    );
    const permisos = pRes.rows.map((pr) => pr.codigo);

    return new Usuario({
      id: r.id,
      nombre: r.nombre,
      email: r.email,
      pinSeguridad: r.pin_seguridad,
      rolId: r.rol_id,
      rolNombre: r.rol_nombre,
      rolSlug: r.rol_slug,
      permisos,
      areaAsignadaId: r.area_asignada_id,
      activo: r.activo,
      createdAt: new Date(r.created_at),
    });
  }

  public async createUsuario(schemaName: string, u: Usuario): Promise<Usuario> {
    const s = sanitizeSchema(schemaName);
    await dbPool.query(
      `INSERT INTO "${s}".usuarios (id, nombre, email, pin_seguridad, rol_id, area_asignada_id, activo, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [u.id, u.nombre, u.email, u.pinSeguridad || null, u.rolId, u.areaAsignadaId || null, u.activo, u.createdAt]
    );
    return u;
  }
}
