import { dbPool, testDbConnection } from '../src/infrastructure/database/connection.js';
import { logger } from '../src/core/logger/logger.js';
import { v4 as uuidv4 } from 'uuid';

async function migrateTenants() {
  logger.info('🚀 Ejecutando migración de esquemas de tenants en PostgreSQL Cloud Neon...');

  const connected = await testDbConnection();
  if (!connected) {
    logger.error('❌ No se pudo conectar a la base de datos');
    process.exit(1);
  }

  const client = await dbPool.connect();

  try {
    const tenantsRes = await client.query('SELECT slug, schema_name FROM public.tenants WHERE status = $1', ['ACTIVE']);
    const tenants = tenantsRes.rows;

    for (const t of tenants) {
      const s = t.schema_name;
      logger.info(`📦 Migrando esquema: ${s} (${t.slug})...`);

      await client.query('BEGIN');

      // 1. Agregar columnas faltantes en facturas_fiscales
      await client.query(`
        ALTER TABLE "${s}".facturas_fiscales 
        ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(40) NOT NULL DEFAULT 'EFECTIVO';
      `);

      await client.query(`
        ALTER TABLE "${s}".facturas_fiscales 
        ADD COLUMN IF NOT EXISTS notas TEXT;
      `);

      await client.query(`
        ALTER TABLE "${s}".facturas_fiscales 
        ADD COLUMN IF NOT EXISTS factura_referencia_id VARCHAR(64) REFERENCES "${s}".facturas_fiscales(id) ON DELETE SET NULL;
      `);

      // 2. Crear tabla pagos_factura
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".pagos_factura (
          id VARCHAR(64) PRIMARY KEY,
          factura_id VARCHAR(64) NOT NULL REFERENCES "${s}".facturas_fiscales(id) ON DELETE CASCADE,
          monto NUMERIC(14, 2) NOT NULL,
          metodo_pago VARCHAR(40) NOT NULL DEFAULT 'EFECTIVO',
          referencia VARCHAR(100),
          notas TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_pagos_factura ON "${s}".pagos_factura(factura_id);
      `);

      // 3. Crear pagos para facturas ACEPTADAS que no tengan aún pago registrado
      const unpaidInvoices = await client.query(`
        SELECT f.id, f.consecutivo, f.total_pagar, f.metodo_pago, f.created_at
        FROM "${s}".facturas_fiscales f
        WHERE f.estado_dian IN ('ACEPTADA', 'PAGADA')
          AND NOT EXISTS (
            SELECT 1 FROM "${s}".pagos_factura p WHERE p.factura_id = f.id
          )
      `);

      for (const inv of unpaidInvoices.rows) {
        await client.query(`
          INSERT INTO "${s}".pagos_factura (id, factura_id, monto, metodo_pago, referencia, notas, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          uuidv4(),
          inv.id,
          Number(inv.total_pagar),
          inv.metodo_pago || 'EFECTIVO',
          `PAGO-AUTO-${inv.consecutivo}`,
          'Cobro liquidado en emisión de factura',
          inv.created_at || new Date()
        ]);
      }

      logger.info(`✅ Pagos iniciales sincronizados para ${unpaidInvoices.rows.length} facturas en ${s}`);

      await client.query('COMMIT');
    }

    logger.info('🎉 ¡Todas las tablas y esquemas de facturación fueron migrados y sincronizados con éxito!');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Error durante la migración de esquemas de tenants');
    throw err;
  } finally {
    client.release();
    await dbPool.end();
  }
}

migrateTenants().catch((err) => {
  console.error(err);
  process.exit(1);
});
