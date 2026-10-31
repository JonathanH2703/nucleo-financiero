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

      // 4. Migración de Terceros (nuevos campos fiscales y bancarios)
      await client.query(`
        ALTER TABLE "${s}".terceros
          ADD COLUMN IF NOT EXISTS nombre_comercial VARCHAR(255),
          ADD COLUMN IF NOT EXISTS departamento VARCHAR(100) DEFAULT 'Cundinamarca',
          ADD COLUMN IF NOT EXISTS tipo_contribuyente VARCHAR(40),
          ADD COLUMN IF NOT EXISTS responsabilidades_rut TEXT,
          ADD COLUMN IF NOT EXISTS aplica_retefuente BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS tarifa_retefuente NUMERIC(5, 4) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS aplica_reteica BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS tarifa_reteica NUMERIC(5, 4) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS aplica_reteiva BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS banco VARCHAR(100),
          ADD COLUMN IF NOT EXISTS tipo_cuenta VARCHAR(20),
          ADD COLUMN IF NOT EXISTS numero_cuenta VARCHAR(50),
          ADD COLUMN IF NOT EXISTS contacto_nombre VARCHAR(150),
          ADD COLUMN IF NOT EXISTS contacto_cargo VARCHAR(100),
          ADD COLUMN IF NOT EXISTS contacto_celular VARCHAR(50),
          ADD COLUMN IF NOT EXISTS plazo_pago_dias INT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS descuento_pronto_pago NUMERIC(5, 2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS cupo_credito NUMERIC(14, 2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `);

      // 5. Migración de Categorías y Productos
      await client.query(`
        ALTER TABLE "${s}".categorias
          ADD COLUMN IF NOT EXISTS categoria_padre_id VARCHAR(64) REFERENCES "${s}".categorias(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
          ADD COLUMN IF NOT EXISTS descripcion TEXT;

        ALTER TABLE "${s}".productos
          ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500),
          ADD COLUMN IF NOT EXISTS imagen_key VARCHAR(500),
          ADD COLUMN IF NOT EXISTS marca VARCHAR(150),
          ADD COLUMN IF NOT EXISTS tiene_lotes BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS tiene_vencimiento BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS unidad_medida_compra VARCHAR(30) DEFAULT 'UNIDAD',
          ADD COLUMN IF NOT EXISTS factor_conversion_compra NUMERIC(10, 4) DEFAULT 1;
      `);

      // 6. Sucursales y Bodegas
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".sucursales (
          id VARCHAR(64) PRIMARY KEY,
          nombre VARCHAR(150) NOT NULL,
          codigo VARCHAR(50) NOT NULL UNIQUE,
          direccion VARCHAR(255),
          ciudad VARCHAR(100) DEFAULT 'Bogotá D.C.',
          departamento VARCHAR(100) DEFAULT 'Cundinamarca',
          telefono VARCHAR(50),
          responsable_id VARCHAR(64),
          activa BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "${s}".bodegas (
          id VARCHAR(64) PRIMARY KEY,
          sucursal_id VARCHAR(64) NOT NULL REFERENCES "${s}".sucursales(id) ON DELETE CASCADE,
          nombre VARCHAR(150) NOT NULL,
          codigo VARCHAR(50) NOT NULL UNIQUE,
          tipo VARCHAR(30) NOT NULL DEFAULT 'PRINCIPAL',
          activa BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_bodegas_sucursal ON "${s}".bodegas(sucursal_id);
      `);

      // 7. Variantes de Producto
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".producto_variantes (
          id VARCHAR(64) PRIMARY KEY,
          producto_id VARCHAR(64) NOT NULL REFERENCES "${s}".productos(id) ON DELETE CASCADE,
          nombre VARCHAR(150) NOT NULL,
          sku VARCHAR(100),
          codigo_barras VARCHAR(100),
          unidad_medida VARCHAR(30) NOT NULL DEFAULT 'UNIDAD',
          factor_conversion NUMERIC(10, 4) NOT NULL DEFAULT 1,
          precio_base NUMERIC(14, 2) NOT NULL DEFAULT 0,
          costo NUMERIC(14, 2) NOT NULL DEFAULT 0,
          activo BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_variantes_producto ON "${s}".producto_variantes(producto_id);
        CREATE INDEX IF NOT EXISTS idx_variantes_barcode ON "${s}".producto_variantes(codigo_barras);
      `);

      // 8. Listas de Precios y Precios Producto
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".listas_precios (
          id VARCHAR(64) PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          descripcion TEXT,
          moneda VARCHAR(10) DEFAULT 'COP',
          activa BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "${s}".precios_producto (
          id VARCHAR(64) PRIMARY KEY,
          lista_precio_id VARCHAR(64) NOT NULL REFERENCES "${s}".listas_precios(id) ON DELETE CASCADE,
          producto_id VARCHAR(64) NOT NULL REFERENCES "${s}".productos(id) ON DELETE CASCADE,
          variante_id VARCHAR(64) REFERENCES "${s}".producto_variantes(id) ON DELETE CASCADE,
          precio NUMERIC(14, 2) NOT NULL,
          descuento_maximo NUMERIC(5, 2) DEFAULT 0,
          UNIQUE(lista_precio_id, producto_id, variante_id)
        );
      `);

      // 9. Relación Proveedor-Producto (M:N)
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".proveedor_producto (
          id VARCHAR(64) PRIMARY KEY,
          proveedor_id UUID NOT NULL REFERENCES "${s}".terceros(id) ON DELETE CASCADE,
          producto_id VARCHAR(64) NOT NULL REFERENCES "${s}".productos(id) ON DELETE CASCADE,
          precio_compra NUMERIC(14, 2) NOT NULL DEFAULT 0,
          unidad_compra VARCHAR(30) NOT NULL DEFAULT 'UNIDAD',
          tiempo_entrega_dias INT DEFAULT 0,
          es_proveedor_principal BOOLEAN NOT NULL DEFAULT false,
          notas TEXT,
          activo BOOLEAN NOT NULL DEFAULT true,
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(proveedor_id, producto_id)
        );

        CREATE INDEX IF NOT EXISTS idx_prov_prod_proveedor ON "${s}".proveedor_producto(proveedor_id);
        CREATE INDEX IF NOT EXISTS idx_prov_prod_producto ON "${s}".proveedor_producto(producto_id);
      `);

      // 10. Stock por Bodega y Lotes
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".stock_bodegas (
          id VARCHAR(64) PRIMARY KEY,
          producto_id VARCHAR(64) NOT NULL REFERENCES "${s}".productos(id) ON DELETE CASCADE,
          variante_id VARCHAR(64) REFERENCES "${s}".producto_variantes(id) ON DELETE CASCADE,
          bodega_id VARCHAR(64) NOT NULL REFERENCES "${s}".bodegas(id) ON DELETE CASCADE,
          cantidad NUMERIC(12, 2) NOT NULL DEFAULT 0,
          costo_promedio NUMERIC(14, 2) NOT NULL DEFAULT 0,
          UNIQUE(producto_id, variante_id, bodega_id)
        );

        CREATE INDEX IF NOT EXISTS idx_stock_producto ON "${s}".stock_bodegas(producto_id);
        CREATE INDEX IF NOT EXISTS idx_stock_bodega ON "${s}".stock_bodegas(bodega_id);

        CREATE TABLE IF NOT EXISTS "${s}".lotes_inventario (
          id VARCHAR(64) PRIMARY KEY,
          producto_id VARCHAR(64) NOT NULL REFERENCES "${s}".productos(id) ON DELETE CASCADE,
          variante_id VARCHAR(64) REFERENCES "${s}".producto_variantes(id),
          bodega_id VARCHAR(64) NOT NULL REFERENCES "${s}".bodegas(id) ON DELETE CASCADE,
          numero_lote VARCHAR(100) NOT NULL,
          fecha_vencimiento DATE,
          fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          cantidad_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0,
          cantidad_disponible NUMERIC(12, 2) NOT NULL DEFAULT 0,
          costo_unitario NUMERIC(14, 2) DEFAULT 0,
          activo BOOLEAN NOT NULL DEFAULT true
        );

        CREATE INDEX IF NOT EXISTS idx_lotes_producto ON "${s}".lotes_inventario(producto_id);
        CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento ON "${s}".lotes_inventario(fecha_vencimiento);
      `);

      // 11. Movimientos de Inventario (Kardex) y Ajustes
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".movimientos_inventario (
          id VARCHAR(64) PRIMARY KEY,
          producto_id VARCHAR(64) NOT NULL REFERENCES "${s}".productos(id) ON DELETE RESTRICT,
          variante_id VARCHAR(64) REFERENCES "${s}".producto_variantes(id),
          bodega_id VARCHAR(64) NOT NULL REFERENCES "${s}".bodegas(id) ON DELETE RESTRICT,
          tipo VARCHAR(30) NOT NULL,
          cantidad NUMERIC(12, 2) NOT NULL,
          costo_unitario NUMERIC(14, 2) DEFAULT 0,
          saldo_anterior NUMERIC(12, 2) NOT NULL DEFAULT 0,
          saldo_nuevo NUMERIC(12, 2) NOT NULL DEFAULT 0,
          lote_id VARCHAR(64),
          referencia_documento VARCHAR(100),
          referencia_tipo VARCHAR(40),
          notas TEXT,
          creado_por VARCHAR(64),
          fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_mov_inv_producto ON "${s}".movimientos_inventario(producto_id);
        CREATE INDEX IF NOT EXISTS idx_mov_inv_bodega ON "${s}".movimientos_inventario(bodega_id);
        CREATE INDEX IF NOT EXISTS idx_mov_inv_fecha ON "${s}".movimientos_inventario(fecha DESC);
        CREATE INDEX IF NOT EXISTS idx_mov_inv_tipo ON "${s}".movimientos_inventario(tipo);

        CREATE TABLE IF NOT EXISTS "${s}".ajustes_inventario (
          id VARCHAR(64) PRIMARY KEY,
          bodega_id VARCHAR(64) NOT NULL REFERENCES "${s}".bodegas(id) ON DELETE RESTRICT,
          numero VARCHAR(50) NOT NULL UNIQUE,
          tipo VARCHAR(30) NOT NULL DEFAULT 'CONTEO_FISICO',
          observaciones TEXT,
          estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
          creado_por VARCHAR(64),
          aprobado_por VARCHAR(64),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "${s}".ajuste_items (
          id VARCHAR(64) PRIMARY KEY,
          ajuste_id VARCHAR(64) NOT NULL REFERENCES "${s}".ajustes_inventario(id) ON DELETE CASCADE,
          producto_id VARCHAR(64) NOT NULL REFERENCES "${s}".productos(id),
          variante_id VARCHAR(64) REFERENCES "${s}".producto_variantes(id),
          cantidad_sistema NUMERIC(12, 2) NOT NULL DEFAULT 0,
          cantidad_fisica NUMERIC(12, 2) NOT NULL DEFAULT 0,
          diferencia NUMERIC(12, 2) NOT NULL DEFAULT 0,
          costo_unitario NUMERIC(14, 2) DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_ajuste_items ON "${s}".ajuste_items(ajuste_id);
      `);

      // 12. Órdenes de Compra, Recepciones y Cuentas por Pagar
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".ordenes_compra (
          id VARCHAR(64) PRIMARY KEY,
          proveedor_id UUID NOT NULL REFERENCES "${s}".terceros(id),
          proveedor_nombre VARCHAR(255),
          bodega_destino_id VARCHAR(64) NOT NULL REFERENCES "${s}".bodegas(id),
          numero VARCHAR(50) NOT NULL UNIQUE,
          estado VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
          fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          fecha_entrega_estimada DATE,
          subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
          impuestos NUMERIC(14, 2) NOT NULL DEFAULT 0,
          total NUMERIC(14, 2) NOT NULL DEFAULT 0,
          notas TEXT,
          creado_por VARCHAR(64),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_oc_proveedor ON "${s}".ordenes_compra(proveedor_id);
        CREATE INDEX IF NOT EXISTS idx_oc_estado ON "${s}".ordenes_compra(estado);

        CREATE TABLE IF NOT EXISTS "${s}".orden_compra_items (
          id VARCHAR(64) PRIMARY KEY,
          orden_id VARCHAR(64) NOT NULL REFERENCES "${s}".ordenes_compra(id) ON DELETE CASCADE,
          producto_id VARCHAR(64) NOT NULL REFERENCES "${s}".productos(id),
          variante_id VARCHAR(64) REFERENCES "${s}".producto_variantes(id),
          producto_nombre VARCHAR(255) NOT NULL,
          cantidad_solicitada NUMERIC(12, 2) NOT NULL DEFAULT 0,
          cantidad_recibida NUMERIC(12, 2) NOT NULL DEFAULT 0,
          precio_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0,
          subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_oci_orden ON "${s}".orden_compra_items(orden_id);

        CREATE TABLE IF NOT EXISTS "${s}".recepciones_compra (
          id VARCHAR(64) PRIMARY KEY,
          orden_compra_id VARCHAR(64) REFERENCES "${s}".ordenes_compra(id) ON DELETE SET NULL,
          proveedor_id UUID NOT NULL REFERENCES "${s}".terceros(id),
          bodega_id VARCHAR(64) NOT NULL REFERENCES "${s}".bodegas(id),
          numero VARCHAR(50) NOT NULL UNIQUE,
          fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          recibido_por VARCHAR(64),
          notas TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "${s}".recepcion_items (
          id VARCHAR(64) PRIMARY KEY,
          recepcion_id VARCHAR(64) NOT NULL REFERENCES "${s}".recepciones_compra(id) ON DELETE CASCADE,
          producto_id VARCHAR(64) NOT NULL REFERENCES "${s}".productos(id),
          variante_id VARCHAR(64) REFERENCES "${s}".producto_variantes(id),
          cantidad_recibida NUMERIC(12, 2) NOT NULL,
          costo_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0,
          lote_numero VARCHAR(100),
          fecha_vencimiento DATE
        );

        CREATE INDEX IF NOT EXISTS idx_ri_recepcion ON "${s}".recepcion_items(recepcion_id);

        CREATE TABLE IF NOT EXISTS "${s}".cuentas_por_pagar (
          id VARCHAR(64) PRIMARY KEY,
          proveedor_id UUID NOT NULL REFERENCES "${s}".terceros(id),
          proveedor_nombre VARCHAR(255),
          factura_proveedor_numero VARCHAR(100),
          orden_compra_id VARCHAR(64) REFERENCES "${s}".ordenes_compra(id) ON DELETE SET NULL,
          recepcion_id VARCHAR(64) REFERENCES "${s}".recepciones_compra(id) ON DELETE SET NULL,
          monto NUMERIC(14, 2) NOT NULL,
          saldo NUMERIC(14, 2) NOT NULL,
          fecha_emision TIMESTAMPTZ DEFAULT NOW(),
          fecha_vencimiento DATE,
          estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
          notas TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_cxp_proveedor ON "${s}".cuentas_por_pagar(proveedor_id);
        CREATE INDEX IF NOT EXISTS idx_cxp_estado ON "${s}".cuentas_por_pagar(estado);
        CREATE INDEX IF NOT EXISTS idx_cxp_vencimiento ON "${s}".cuentas_por_pagar(fecha_vencimiento);
      `);

      // 13. Asientos y Líneas Contables
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".asientos_contables (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          numero_comprobante VARCHAR(50) NOT NULL UNIQUE,
          tipo VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
          fecha DATE NOT NULL DEFAULT CURRENT_DATE,
          concepto TEXT NOT NULL,
          tercero_nit VARCHAR(50),
          tercero_nombre VARCHAR(255),
          total_debito NUMERIC(14, 2) NOT NULL DEFAULT 0,
          total_credito NUMERIC(14, 2) NOT NULL DEFAULT 0,
          cuadrado BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "${s}".asiento_lineas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          asiento_id UUID REFERENCES "${s}".asientos_contables(id) ON DELETE CASCADE,
          cuenta_codigo VARCHAR(20) NOT NULL,
          cuenta_nombre VARCHAR(150) NOT NULL,
          descripcion TEXT,
          debito NUMERIC(14, 2) NOT NULL DEFAULT 0,
          credito NUMERIC(14, 2) NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_asiento_lineas_asiento ON "${s}".asiento_lineas(asiento_id);
        CREATE INDEX IF NOT EXISTS idx_asiento_lineas_cuenta ON "${s}".asiento_lineas(cuenta_codigo);
      `);

      // 14. Aprovisionamiento por defecto de Sucursal Principal y Bodega Principal si no existen
      const sucCount = await client.query(`SELECT COUNT(*) FROM "${s}".sucursales`);
      if (parseInt(sucCount.rows[0].count, 10) === 0) {
        const sucId = `suc_principal_${t.slug}`;
        const bodId = `bod_principal_${t.slug}`;

        await client.query(`
          INSERT INTO "${s}".sucursales (id, nombre, codigo, direccion, ciudad, activa)
          VALUES ($1, 'Sede Principal', 'SEDE-01', 'Calle Principal', 'Bogotá D.C.', true)
          ON CONFLICT (codigo) DO NOTHING;
        `, [sucId]);

        await client.query(`
          INSERT INTO "${s}".bodegas (id, sucursal_id, nombre, codigo, tipo, activa)
          VALUES ($1, $2, 'Bodega Principal', 'BOD-01', 'PRINCIPAL', true)
          ON CONFLICT (codigo) DO NOTHING;
        `, [bodId, sucId]);

        // Sincronizar stock inicial de productos existentes hacia stock_bodegas
        await client.query(`
          INSERT INTO "${s}".stock_bodegas (id, producto_id, bodega_id, cantidad, costo_promedio)
          SELECT 
            'stk_' || p.id,
            p.id,
            $1,
            COALESCE(p.stock_actual, 0),
            COALESCE(p.costo, 0)
          FROM "${s}".productos p
          ON CONFLICT (producto_id, variante_id, bodega_id) DO NOTHING;
        `, [bodId]);

        // Crear listas de precios iniciales (General y Mayorista)
        await client.query(`
          INSERT INTO "${s}".listas_precios (id, nombre, descripcion, moneda, activa) VALUES
          ('lp_general', 'Precio General / Venta al Público', 'Tarifa estándar mostrador', 'COP', true),
          ('lp_mayorista', 'Precio Mayorista / B2B', 'Tarifa preferencial con descuento', 'COP', true)
          ON CONFLICT (id) DO NOTHING;
        `);

        logger.info(`🏢 Sucursal y Bodega principal aprovisionadas con éxito para ${s}`);
      }

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
