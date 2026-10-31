import { dbPool, testDbConnection } from '../src/infrastructure/database/connection.js';
import { logger } from '../src/core/logger/logger.js';
import { v4 as uuidv4 } from 'uuid';

async function setupCleanAuthData() {
  logger.info('🚀 Iniciando configuración y limpieza de datos de autenticación (NIT + PIN)...');

  const connected = await testDbConnection();
  if (!connected) {
    logger.error('❌ No se pudo conectar a la base de datos Neon');
    process.exit(1);
  }

  const client = await dbPool.connect();

  try {
    // 1. Asegurar columna admin_pin en public.tenants
    await client.query(`
      ALTER TABLE public.tenants 
      ADD COLUMN IF NOT EXISTS admin_pin VARCHAR(20) DEFAULT '123456';
    `);
    logger.info('✅ Columna admin_pin asegurada en public.tenants');

    // 2. Definir empresas base con sus NITs limpios y PINs
    const empresas = [
      {
        id: 't-origen-01',
        name: 'Restaurante & Bar Origen S.A.S.',
        slug: 'restaurante_origen',
        tax_id: '901.445.772-0',
        schema_name: 'tenant_restaurante_origen',
        admin_pin: '123456',
        sucursales: [
          {
            id: 'suc_origen_g',
            nombre: 'Sede Principal Zona G',
            codigo: 'SUC-01',
            direccion: 'Cra 5 # 69-26, Zona G',
            telefono: '+57 (1) 745-8899',
            pin_acceso: '1001',
          },
          {
            id: 'suc_origen_93',
            nombre: 'Sede Parque 93',
            codigo: 'SUC-02',
            direccion: 'Cl 93A # 13-24, Chicó',
            telefono: '+57 (1) 610-3322',
            pin_acceso: '1002',
          },
        ],
      },
      {
        id: 't-nogal-02',
        name: 'Panadería & Pastelería El Nogal',
        slug: 'panaderia_el_nogal',
        tax_id: '901.332.558-9',
        schema_name: 'tenant_panaderia_el_nogal',
        admin_pin: '123456',
        sucursales: [
          {
            id: 'suc_nogal_01',
            nombre: 'Sede Principal El Nogal',
            codigo: 'SUC-01',
            direccion: 'Cra 11 # 78-45',
            telefono: '+57 (1) 312-4455',
            pin_acceso: '2001',
          },
        ],
      },
      {
        id: 't-mercados-03',
        name: 'Supermercado & Droguería La 18',
        slug: 'mercados_la_18',
        tax_id: '900.741.225-1',
        schema_name: 'tenant_mercados_la_18',
        admin_pin: '123456',
        sucursales: [
          {
            id: 'suc_mercados_01',
            nombre: 'Sede Central La 18',
            codigo: 'SUC-01',
            direccion: 'Av Calle 18 # 24-50',
            telefono: '+57 (1) 234-5678',
            pin_acceso: '3001',
          },
        ],
      },
      {
        id: 't-andina-04',
        name: 'Distribuidora Andina Ltda.',
        slug: 'comercializadora_andina',
        tax_id: '800.987.654-3',
        schema_name: 'tenant_comercializadora_andina',
        admin_pin: '123456',
        sucursales: [
          {
            id: 'suc_andina_01',
            nombre: 'Bodega Principal Almacén',
            codigo: 'SUC-01',
            direccion: 'Parque Industrial Celta Km 7',
            telefono: '+57 (1) 890-1234',
            pin_acceso: '4001',
          },
        ],
      },
    ];

    for (const emp of empresas) {
      const s = emp.schema_name;

      // Actualizar tenant en public.tenants
      await client.query(`
        UPDATE public.tenants 
        SET admin_pin = $1, tax_id = $2, name = $3
        WHERE slug = $4
      `, [emp.admin_pin, emp.tax_id, emp.name, emp.slug]);

      // Asegurar columnas en el esquema del tenant
      await client.query(`
        ALTER TABLE "${s}".sucursales 
        ADD COLUMN IF NOT EXISTS pin_acceso VARCHAR(20);

        ALTER TABLE "${s}".usuarios 
        ADD COLUMN IF NOT EXISTS sucursal_id VARCHAR(64);
      `);

      // Configurar sucursales con sus PINs distintos
      for (const suc of emp.sucursales) {
        const existingSuc = await client.query(`SELECT id FROM "${s}".sucursales WHERE codigo = $1`, [suc.codigo]);
        if (existingSuc.rows.length === 0) {
          await client.query(`
            INSERT INTO "${s}".sucursales (id, nombre, codigo, direccion, ciudad, telefono, pin_acceso, activa)
            VALUES ($1, $2, $3, $4, 'Bogotá D.C.', $5, $6, true)
          `, [suc.id, suc.nombre, suc.codigo, suc.direccion, suc.telefono, suc.pin_acceso]);
        } else {
          await client.query(`
            UPDATE "${s}".sucursales 
            SET nombre = $1, direccion = $2, telefono = $3, pin_acceso = $4, activa = true
            WHERE codigo = $5
          `, [suc.nombre, suc.direccion, suc.telefono, suc.pin_acceso, suc.codigo]);
        }
      }

      logger.info(`🏢 Empresa ${emp.name} configurada con PIN admin (${emp.admin_pin}) y sucursales con PIN.`);
    }

    logger.info('🎉 ¡Datos de autenticación limpios y configurados exitosamente!');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error configurando datos de autenticación');
    process.exit(1);
  } finally {
    client.release();
  }
}

setupCleanAuthData();
