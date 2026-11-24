import { dbPool, testDbConnection } from '../src/infrastructure/database/connection.js';
import { v4 as uuidv4 } from 'uuid';

async function seedSmallBusinessInventory() {
  console.log('🚀 Verificando y poblando catálogo/inventario para pequeños comercios (Panadería El Nogal y Mercados La 18)...');
  await testDbConnection();

  const client = await dbPool.connect();

  try {
    // ─── 1. Panadería El Nogal (Plan Básico) ───────────────────
    const schemaPan = 'tenant_panaderia_el_nogal';

    // Asegurar bodega
    const bodPanRes = await client.query(`SELECT id FROM "${schemaPan}".bodegas WHERE codigo = 'BOD-01';`);
    let bodegaPanId = bodPanRes.rows[0]?.id;
    if (!bodegaPanId) {
      bodegaPanId = `bod_nogal_princ_${uuidv4().substring(0, 8)}`;
      await client.query(`
        INSERT INTO "${schemaPan}".bodegas (id, sucursal_id, codigo, nombre, tipo, ubicacion, activo)
        VALUES ($1, 'suc_nogal_01', 'BOD-01', 'Bodega Principal & Despacho', 'PRINCIPAL', 'Cra 11 # 78-45', true)
        ON CONFLICT (id) DO NOTHING;
      `, [bodegaPanId]);
    }

    // Categorías Panadería
    const catPanaderiaId = 'cat_pan_tradicional';
    const catPasteleriaId = 'cat_reposteria_cafe';
    await client.query(`
      INSERT INTO "${schemaPan}".categorias (id, nombre, icono, color, orden, activo, slug)
      VALUES 
        ($1, 'Panadería Tradicional', 'bread', '#d97706', 1, true, 'panaderia'),
        ($2, 'Pastelería & Cafetería', 'cake', '#db2777', 2, true, 'pasteleria')
      ON CONFLICT (id) DO NOTHING;
    `, [catPanaderiaId, catPasteleriaId]);

    // Productos Panadería
    const prodsPan = [
      { id: 'prod_croissant_mantequilla', sku: 'PAN-001', nombre: 'Croissant Francés de Mantequilla', cat: catPasteleriaId, unidad: 'UNIDAD', costo: 2200, precio: 5500, stock: 45, min: 10 },
      { id: 'prod_pan_rollo_artesanal', sku: 'PAN-002', nombre: 'Pan Rollo Artesanal (Bolsa x 6)', cat: catPanaderiaId, unidad: 'PAQUETE', costo: 3000, precio: 6800, stock: 30, min: 8 },
      { id: 'prod_pan_integral_granos', sku: 'PAN-003', nombre: 'Pan Tajado 7 Granos', cat: catPanaderiaId, unidad: 'UNIDAD', costo: 4200, precio: 9500, stock: 20, min: 5 },
      { id: 'prod_torta_zanahoria_porcion', sku: 'PAS-001', nombre: 'Porción Torta de Zanahoria & Nuez', cat: catPasteleriaId, unidad: 'PORCION', costo: 3500, precio: 8000, stock: 15, min: 4 },
      { id: 'prod_cafe_latte_12oz', sku: 'BEB-001', nombre: 'Café Latte Especial 12oz', cat: catPasteleriaId, unidad: 'UNIDAD', costo: 1800, precio: 6500, stock: 60, min: 15 },
    ];

    for (const p of prodsPan) {
      await client.query(`
        INSERT INTO "${schemaPan}".productos (id, categoria_id, nombre, descripcion, sku, codigo_barras, precio_base, costo, tipo_impuesto, unidad_medida, stock_actual, stock_minimo, activo)
        VALUES ($1, $2, $3, $4, $5, $5, $6, $7, 'EXCLUIDO', $8, $9, $10, true)
        ON CONFLICT (id) DO UPDATE SET precio_base = $6, costo = $7, stock_actual = $9;
      `, [p.id, p.cat, p.nombre, p.nombre, p.sku, p.precio, p.costo, p.unidad, p.stock, p.min]);

      await client.query(`
        INSERT INTO "${schemaPan}".stock_bodegas (id, bodega_id, producto_id, cantidad, costo_promedio)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET cantidad = $4;
      `, [`stk_${p.id}`, bodegaPanId, p.id, p.stock, p.costo]);
    }

    // ─── 2. Supermercado & Droguería La 18 (Plan Básico) ───────
    const schemaMer = 'tenant_mercados_la_18';

    const bodMerRes = await client.query(`SELECT id FROM "${schemaMer}".bodegas WHERE codigo = 'BOD-01';`);
    let bodegaMerId = bodMerRes.rows[0]?.id;
    if (!bodegaMerId) {
      bodegaMerId = `bod_mercados_princ_${uuidv4().substring(0, 8)}`;
      await client.query(`
        INSERT INTO "${schemaMer}".bodegas (id, sucursal_id, codigo, nombre, tipo, ubicacion, activo)
        VALUES ($1, 'suc_mercados_01', 'BOD-01', 'Bodega Almacén Central', 'PRINCIPAL', 'Cra 18 # 45-12', true)
        ON CONFLICT (id) DO NOTHING;
      `, [bodegaMerId]);
    }

    const catAbarrotes = 'cat_abarrotes_granos';
    const catLacteos = 'cat_lacteos_frescos';
    await client.query(`
      INSERT INTO "${schemaMer}".categorias (id, nombre, icono, color, orden, activo, slug)
      VALUES 
        ($1, 'Abarrotes y Despensa', 'shopping-bag', '#16a34a', 1, true, 'abarrotes'),
        ($2, 'Lácteos y Refrigerados', 'droplet', '#2563eb', 2, true, 'lacteos')
      ON CONFLICT (id) DO NOTHING;
    `, [catAbarrotes, catLacteos]);

    const prodsMer = [
      { id: 'prod_arroz_diana_1kg', sku: 'ABA-001', nombre: 'Arroz Diana Premium 1000g', cat: catAbarrotes, unidad: 'KG_GRAMOS', costo: 3800, precio: 4900, stock: 120, min: 20 },
      { id: 'prod_aceite_girasol_1000ml', sku: 'ABA-002', nombre: 'Aceite de Girasol 1000ml', cat: catAbarrotes, unidad: 'LITRO_ML', costo: 8500, precio: 11900, stock: 40, min: 10 },
      { id: 'prod_leche_entera_alqueria', sku: 'LAC-001', nombre: 'Leche Entera Alquería 1100ml', cat: catLacteos, unidad: 'LITRO_ML', costo: 3900, precio: 5200, stock: 85, min: 15 },
      { id: 'prod_queso_campesino_500g', sku: 'LAC-002', nombre: 'Queso Campesino Fresco 500g', cat: catLacteos, unidad: 'KG_GRAMOS', costo: 7200, precio: 10500, stock: 25, min: 6 },
    ];

    for (const p of prodsMer) {
      await client.query(`
        INSERT INTO "${schemaMer}".productos (id, categoria_id, nombre, descripcion, sku, codigo_barras, precio_base, costo, tipo_impuesto, unidad_medida, stock_actual, stock_minimo, activo)
        VALUES ($1, $2, $3, $4, $5, $5, $6, $7, 'EXCLUIDO', $8, $9, $10, true)
        ON CONFLICT (id) DO UPDATE SET precio_base = $6, costo = $7, stock_actual = $9;
      `, [p.id, p.cat, p.nombre, p.nombre, p.sku, p.precio, p.costo, p.unidad, p.stock, p.min]);

      await client.query(`
        INSERT INTO "${schemaMer}".stock_bodegas (id, bodega_id, producto_id, cantidad, costo_promedio)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET cantidad = $4;
      `, [`stk_${p.id}`, bodegaMerId, p.id, p.stock, p.costo]);
    }

    console.log('✅ Catálogo y existencias para Panadería El Nogal y Mercados La 18 asegurados exitosamente.');
  } catch (err) {
    console.error('❌ Error asegurando inventario:', err);
  } finally {
    client.release();
    await dbPool.end();
  }
}

seedSmallBusinessInventory();
