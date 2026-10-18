import pg from 'pg';
import { env } from '../../config/env.js';
import { logger } from '../../core/logger/logger.js';

const { Pool } = pg;

export const dbPool = env.DATABASE_URL
  ? new Pool({
      connectionString: env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: env.DB_MAX_CONNECTIONS,
    })
  : new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      max: env.DB_MAX_CONNECTIONS,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
    });

dbPool.on('error', (err) => {
  logger.error({ err }, 'Error inesperado en el pool de conexiones de PostgreSQL');
});

export async function testDbConnection(): Promise<boolean> {
  try {
    const client = await dbPool.connect();
    const res = await client.query('SELECT NOW() as current_time');
    client.release();
    logger.info({ time: res.rows[0].current_time }, 'Conexión a PostgreSQL establecida exitosamente');
    return true;
  } catch (error) {
    logger.warn({ error }, 'No se pudo conectar a PostgreSQL en este momento (verifique si el contenedor o servicio está iniciado)');
    return false;
  }
}

/**
 * Ejecuta una consulta dentro del contexto de un esquema de tenant específico usando search_path
 */
export async function withTenantSchema<T>(
  schemaName: string,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await dbPool.connect();
  try {
    // Validar nombre de esquema para evitar inyección SQL
    if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
      throw new Error(`Nombre de esquema no válido: ${schemaName}`);
    }

    await client.query(`SET search_path TO "${schemaName}", public`);
    return await fn(client);
  } finally {
    try {
      await client.query('RESET search_path');
    } catch {
      // Ignorar si la conexión se cierra
    }
    client.release();
  }
}
