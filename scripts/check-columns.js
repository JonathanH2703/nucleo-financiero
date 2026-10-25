import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const schemas = [
    'tenant_restaurante_origen',
    'tenant_panaderia_el_nogal',
    'tenant_mercados_la_18',
    'tenant_comercializadora_andina'
  ];

  for (const s of schemas) {
    console.log(`\n=== Schema: ${s} ===`);
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
      [s]
    );
    console.log('Tables:', tables.rows.map(r => r.table_name));

    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_name = 'facturas_fiscales' AND table_schema = $1 
       ORDER BY ordinal_position`,
      [s]
    );
    console.log('Columns in facturas_fiscales:');
    cols.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    const hasPagos = tables.rows.some(r => r.table_name === 'pagos_factura');
    console.log('Has pagos_factura table?:', hasPagos);
  }

  await pool.end();
}

check().catch(e => {
  console.error(e);
  pool.end();
});
