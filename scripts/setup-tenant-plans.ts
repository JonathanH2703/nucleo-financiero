import { dbPool, testDbConnection } from '../src/infrastructure/database/connection.js';
import { logger } from '../src/core/logger/logger.js';

async function setupTenantPlans() {
  logger.info('🚀 Configurando columnas de planes y módulos activos en public.tenants...');

  const connected = await testDbConnection();
  if (!connected) {
    logger.error('❌ No se pudo conectar a la base de datos Neon');
    process.exit(1);
  }

  const client = await dbPool.connect();

  try {
    // 1. Añadir columnas plan y modulos_activos a public.tenants
    await client.query(`
      ALTER TABLE public.tenants 
      ADD COLUMN IF NOT EXISTS plan VARCHAR(50) NOT NULL DEFAULT 'basico',
      ADD COLUMN IF NOT EXISTS modulos_activos JSONB NOT NULL DEFAULT '["pos", "inventario", "ajustes"]'::jsonb;
    `);
    logger.info('✅ Columnas plan y modulos_activos aseguradas en public.tenants');

    // 2. Asignar planes iniciales según tipo de negocio:
    // - Restaurante Origen: Plan Intermedio (Mediana Empresa con Facturación, Proveedores y POS)
    // - Distribuidora Andina: Plan Intermedio (Mediana Empresa)
    // - Panadería El Nogal: Plan Básico (Pequeña Empresa: POS + Inventario)
    // - Supermercado La 18: Plan Básico (Pequeña Empresa: POS + Inventario)
    const modulosIntermedio = JSON.stringify(['pos', 'inventario', 'facturacion', 'compras', 'empresas', 'reportes', 'ajustes']);
    const modulosBasico = JSON.stringify(['pos', 'inventario', 'ajustes']);

    await client.query(`
      UPDATE public.tenants 
      SET plan = 'intermedio', modulos_activos = $1::jsonb
      WHERE slug IN ('restaurante_origen', 'comercializadora_andina');
    `, [modulosIntermedio]);

    await client.query(`
      UPDATE public.tenants 
      SET plan = 'basico', modulos_activos = $1::jsonb
      WHERE slug IN ('panaderia_el_nogal', 'mercados_la_18');
    `, [modulosBasico]);

    logger.info('✅ Planes y módulos asignados exitosamente a las empresas registradas');

    // 3. Verificar estado actual
    const res = await client.query(`SELECT id, name, slug, plan, modulos_activos FROM public.tenants;`);
    console.table(res.rows);

  } catch (error) {
    logger.error({ error }, '❌ Error durante la configuración de planes');
    process.exit(1);
  } finally {
    client.release();
    await dbPool.end();
  }
}

setupTenantPlans();
