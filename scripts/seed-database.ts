import { dbPool, testDbConnection } from '../src/infrastructure/database/connection.js';
import { TenantSchemaManager } from '../src/infrastructure/database/tenant-schema-manager.js';
import { logger } from '../src/core/logger/logger.js';

interface TenantSeed {
  id: string;
  name: string;
  slug: string;
  taxId: string;
  schemaName: string;
  quotaBytes: number;
}

const DEMO_TENANTS: TenantSeed[] = [
  {
    id: 't-origen-01',
    name: 'Restaurante & Bar Origen S.A.S.',
    slug: 'restaurante_origen',
    taxId: '901.445.772-0',
    schemaName: 'tenant_restaurante_origen',
    quotaBytes: 10737418240, // 10 GB
  },
  {
    id: 't-nogal-02',
    name: 'Panadería & Pastelería El Nogal',
    slug: 'panaderia_el_nogal',
    taxId: '901.332.558-9',
    schemaName: 'tenant_panaderia_el_nogal',
    quotaBytes: 5368709120, // 5 GB
  },
  {
    id: 't-mercados-03',
    name: 'Supermercado & Droguería La 18',
    slug: 'mercados_la_18',
    taxId: '900.741.225-1',
    schemaName: 'tenant_mercados_la_18',
    quotaBytes: 21474836480, // 20 GB
  },
  {
    id: 't-andina-04',
    name: 'Distribuidora Andina Ltda.',
    slug: 'comercializadora_andina',
    taxId: '800.987.654-3',
    schemaName: 'tenant_comercializadora_andina',
    quotaBytes: 10737418240, // 10 GB
  },
];

async function seedDatabase() {
  logger.info('🌱 Iniciando precarga masiva de datos realistas (Seed Database)...');

  const connected = await testDbConnection();
  if (!connected) {
    logger.error('❌ No fue posible conectar con PostgreSQL. Asegúrate de tener docker compose up -d activo.');
    process.exit(1);
  }

  // 1. Inicializar esquema global public.tenants
  await TenantSchemaManager.initPublicSchema();

  // 2. Insertar tenants demostrativos en public.tenants
  const client = await dbPool.connect();
  try {
    for (const t of DEMO_TENANTS) {
      await client.query(
        `INSERT INTO public.tenants (id, name, slug, tax_id, schema_name, status, storage_quota_bytes)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           tax_id = EXCLUDED.tax_id,
           storage_quota_bytes = EXCLUDED.storage_quota_bytes,
           updated_at = NOW()`,
        [t.id, t.name, t.slug, t.taxId, t.schemaName, t.quotaBytes]
      );
      logger.info(`🏢 Empresa registrada en public.tenants: ${t.name} (${t.slug})`);

      // 3. Aprovisionar esquema PostgreSQL aislado con tablas ERP/POS, RBAC y fixtures
      await TenantSchemaManager.provisionTenantSchema(t.schemaName);
      logger.info(`✨ Esquema aprovisionado con datos realistas: ${t.schemaName}`);
    }

    logger.info('🎉 ¡Precarga de base de datos finalizada exitosamente!');
    logger.info('📋 Empresas y credenciales de prueba listas:');
    logger.info('   - Usuario Super Admin: carlos.mendoza@nucleo.co | PIN Rápido: 123456');
    logger.info('   - Usuario Cajero:       laura.caja@nucleo.co     | PIN Rápido: 112233');
    logger.info('   - Usuario Mesero:       david.salon@nucleo.co    | PIN Rápido: 445566');
    logger.info('   - Usuario Cocina KDS:   chef.roberto@nucleo.co   | PIN Rápido: 778899');
    logger.info('   - Usuario Contadora:    maria.contable@nucleo.co | PIN Rápido: 998877');
  } catch (err) {
    logger.error({ err }, 'Error durante la precarga de base de datos');
    throw err;
  } finally {
    client.release();
    await dbPool.end();
  }
}

seedDatabase().catch(() => process.exit(1));
