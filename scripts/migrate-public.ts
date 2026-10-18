import { TenantSchemaManager } from '../src/infrastructure/database/tenant-schema-manager.js';
import { dbPool } from '../src/infrastructure/database/connection.js';
import { logger } from '../src/core/logger/logger.js';

async function run() {
  try {
    logger.info('Iniciando migración del esquema público...');
    await TenantSchemaManager.initPublicSchema();
    logger.info('Migración del esquema público completada con éxito.');
  } catch (error) {
    logger.error({ error }, 'Fallo en la migración del esquema público');
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

run();
