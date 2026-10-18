import { dbPool } from './connection.js';
import { logger } from '../../core/logger/logger.js';
import { TenantSchemaError } from '../../core/errors/tenant-errors.js';

export class TenantSchemaManager {
  /**
   * Crea la tabla global public.tenants si no existe
   */
  public static async initPublicSchema(): Promise<void> {
    const client = await dbPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.tenants (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          tax_id VARCHAR(50) NOT NULL UNIQUE,
          schema_name VARCHAR(100) NOT NULL UNIQUE,
          status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
          storage_quota_bytes BIGINT NOT NULL DEFAULT 5368709120, -- 5GB por defecto
          storage_used_bytes BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
        CREATE INDEX IF NOT EXISTS idx_tenants_tax_id ON public.tenants(tax_id);
      `);
      logger.info('Esquema global public.tenants inicializado correctamente');
    } catch (error) {
      logger.error({ error }, 'Error al inicializar esquema public.tenants');
      throw new TenantSchemaError('public', error);
    } finally {
      client.release();
    }
  }

  /**
   * Aprovisiona un esquema PostgreSQL dedicado y aislado para un nuevo tenant
   * con sus tablas de archivos contables y documentos
   */
  public static async provisionTenantSchema(schemaName: string): Promise<void> {
    const client = await dbPool.connect();
    try {
      if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
        throw new Error(`Nombre de esquema no válido: ${schemaName}`);
      }

      await client.query('BEGIN');

      // 1. Crear el esquema aislado del cliente
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

      // 2. Tabla de archivos en el bucket
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".archivos (
          id UUID PRIMARY KEY,
          tenant_id VARCHAR(64) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          stored_key VARCHAR(500) NOT NULL UNIQUE,
          bucket_name VARCHAR(100) NOT NULL,
          mime_type VARCHAR(120) NOT NULL,
          size_bytes BIGINT NOT NULL,
          category VARCHAR(60) NOT NULL,
          checksum_sha256 VARCHAR(64),
          status VARCHAR(40) NOT NULL DEFAULT 'PENDING_UPLOAD',
          metadata JSONB DEFAULT '{}'::jsonb,
          uploaded_by_user_id VARCHAR(64),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_archivos_category ON "${schemaName}".archivos(category);
        CREATE INDEX IF NOT EXISTS idx_archivos_status ON "${schemaName}".archivos(status);
        CREATE INDEX IF NOT EXISTS idx_archivos_created_at ON "${schemaName}".archivos(created_at DESC);
      `);

      // 3. Tabla de terceros / CRM (Clientes y Proveedores universales)
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".terceros (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tipo_documento VARCHAR(20) NOT NULL DEFAULT 'NIT',
          numero_documento VARCHAR(50) NOT NULL,
          razon_social VARCHAR(255) NOT NULL,
          email VARCHAR(120),
          telefono VARCHAR(50),
          direccion VARCHAR(255),
          ciudad VARCHAR(100) DEFAULT 'Bogotá D.C.',
          es_cliente BOOLEAN NOT NULL DEFAULT true,
          es_proveedor BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_terceros_doc ON "${schemaName}".terceros(numero_documento);
      `);

      // 4. Módulo RBAC: Permisos granulares, Roles personalizables y Usuarios
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".permisos (
          id VARCHAR(64) PRIMARY KEY,
          modulo VARCHAR(40) NOT NULL,
          codigo VARCHAR(100) NOT NULL UNIQUE,
          nombre VARCHAR(150) NOT NULL,
          descripcion TEXT
        );

        CREATE TABLE IF NOT EXISTS "${schemaName}".roles (
          id VARCHAR(64) PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          slug VARCHAR(60) NOT NULL UNIQUE,
          descripcion TEXT,
          es_sistema BOOLEAN NOT NULL DEFAULT false,
          activo BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "${schemaName}".rol_permisos (
          rol_id VARCHAR(64) REFERENCES "${schemaName}".roles(id) ON DELETE CASCADE,
          permiso_id VARCHAR(64) REFERENCES "${schemaName}".permisos(id) ON DELETE CASCADE,
          PRIMARY KEY (rol_id, permiso_id)
        );

        CREATE TABLE IF NOT EXISTS "${schemaName}".usuarios (
          id VARCHAR(64) PRIMARY KEY,
          nombre VARCHAR(150) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password_hash VARCHAR(255),
          pin_seguridad VARCHAR(10),
          rol_id VARCHAR(64) REFERENCES "${schemaName}".roles(id) ON DELETE RESTRICT,
          area_asignada_id VARCHAR(64),
          activo BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_usuarios_pin ON "${schemaName}".usuarios(pin_seguridad);
        CREATE INDEX IF NOT EXISTS idx_permisos_modulo ON "${schemaName}".permisos(modulo);
      `);

      // 5. Categorías de productos
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".categorias (
          id VARCHAR(64) PRIMARY KEY,
          nombre VARCHAR(120) NOT NULL,
          icono VARCHAR(50) NOT NULL DEFAULT 'tag',
          color VARCHAR(20) NOT NULL DEFAULT '#2563eb',
          orden INT NOT NULL DEFAULT 0,
          activo BOOLEAN NOT NULL DEFAULT true
        );
      `);

      // 6. Catálogo Universal de Productos
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".productos (
          id VARCHAR(64) PRIMARY KEY,
          categoria_id VARCHAR(64) REFERENCES "${schemaName}".categorias(id) ON DELETE SET NULL,
          nombre VARCHAR(255) NOT NULL,
          descripcion TEXT,
          sku VARCHAR(100),
          codigo_barras VARCHAR(100),
          precio_base NUMERIC(14, 2) NOT NULL DEFAULT 0,
          costo NUMERIC(14, 2) NOT NULL DEFAULT 0,
          tipo_impuesto VARCHAR(30) NOT NULL DEFAULT 'IVA_19',
          unidad_medida VARCHAR(30) NOT NULL DEFAULT 'UNIDAD',
          requiere_kds BOOLEAN NOT NULL DEFAULT false,
          stock_actual NUMERIC(12, 2) NOT NULL DEFAULT 0,
          stock_minimo NUMERIC(12, 2) NOT NULL DEFAULT 5,
          activo BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_productos_categoria ON "${schemaName}".productos(categoria_id);
        CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON "${schemaName}".productos(codigo_barras);
        CREATE INDEX IF NOT EXISTS idx_productos_sku ON "${schemaName}".productos(sku);
      `);

      // 7. Áreas Operativas y Puntos de Atención (Mesas / Cajas / Vitrinas)
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".areas_operativas (
          id VARCHAR(64) PRIMARY KEY,
          nombre VARCHAR(120) NOT NULL,
          descripcion VARCHAR(255),
          activo BOOLEAN NOT NULL DEFAULT true
        );

        CREATE TABLE IF NOT EXISTS "${schemaName}".puntos_atencion (
          id VARCHAR(64) PRIMARY KEY,
          area_id VARCHAR(64) REFERENCES "${schemaName}".areas_operativas(id) ON DELETE CASCADE,
          nombre VARCHAR(100) NOT NULL,
          codigo VARCHAR(50) NOT NULL,
          tipo VARCHAR(30) NOT NULL DEFAULT 'MESA',
          capacidad INT NOT NULL DEFAULT 4,
          estado VARCHAR(30) NOT NULL DEFAULT 'LIBRE',
          activo BOOLEAN NOT NULL DEFAULT true
        );
      `);

      // 8. Comandas y Ventas del POS
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".ventas_comandas (
          id VARCHAR(64) PRIMARY KEY,
          numero_comanda VARCHAR(50) NOT NULL UNIQUE,
          modo_atencion VARCHAR(40) NOT NULL DEFAULT 'MOSTRADOR_ESCANER',
          punto_atencion_id VARCHAR(64) REFERENCES "${schemaName}".puntos_atencion(id) ON DELETE SET NULL,
          estado VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE',
          cliente_nombre VARCHAR(255) NOT NULL DEFAULT 'Consumidor Final',
          cliente_nit VARCHAR(50) NOT NULL DEFAULT '222222222222',
          subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
          descuento NUMERIC(14, 2) NOT NULL DEFAULT 0,
          propina_sugerida NUMERIC(14, 2) NOT NULL DEFAULT 0,
          impuesto_consumo NUMERIC(14, 2) NOT NULL DEFAULT 0,
          iva NUMERIC(14, 2) NOT NULL DEFAULT 0,
          total NUMERIC(14, 2) NOT NULL DEFAULT 0,
          notas TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "${schemaName}".items_comanda (
          id VARCHAR(64) PRIMARY KEY,
          comanda_id VARCHAR(64) REFERENCES "${schemaName}".ventas_comandas(id) ON DELETE CASCADE,
          producto_id VARCHAR(64) REFERENCES "${schemaName}".productos(id) ON DELETE RESTRICT,
          nombre_producto VARCHAR(255) NOT NULL,
          cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
          precio_unitario NUMERIC(14, 2) NOT NULL,
          tipo_impuesto VARCHAR(30) NOT NULL,
          notas_cocina VARCHAR(255),
          requiere_kds BOOLEAN NOT NULL DEFAULT false,
          estado_preparacion VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        );

        CREATE INDEX IF NOT EXISTS idx_comandas_estado ON "${schemaName}".ventas_comandas(estado);
        CREATE INDEX IF NOT EXISTS idx_items_comanda ON "${schemaName}".items_comanda(comanda_id);
      `);

      // 9. Facturación Fiscal DIAN y POS Electrónico
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".facturas_fiscales (
          id VARCHAR(64) PRIMARY KEY,
          comanda_id VARCHAR(64) REFERENCES "${schemaName}".ventas_comandas(id) ON DELETE SET NULL,
          prefijo VARCHAR(10) NOT NULL DEFAULT 'FE-2026',
          consecutivo INT NOT NULL,
          numero_completo VARCHAR(50) NOT NULL UNIQUE,
          tipo_documento VARCHAR(50) NOT NULL DEFAULT 'FACTURA_ELECTRONICA_DIAN',
          fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          fecha_vencimiento TIMESTAMPTZ NOT NULL,
          cliente_nombre VARCHAR(255) NOT NULL,
          cliente_nit VARCHAR(50) NOT NULL,
          base_gravable NUMERIC(14, 2) NOT NULL,
          total_iva NUMERIC(14, 2) NOT NULL DEFAULT 0,
          total_impoconsumo NUMERIC(14, 2) NOT NULL DEFAULT 0,
          propina NUMERIC(14, 2) NOT NULL DEFAULT 0,
          total_pagar NUMERIC(14, 2) NOT NULL,
          estado_dian VARCHAR(40) NOT NULL DEFAULT 'ACEPTADA',
          cufe VARCHAR(100),
          qr_code TEXT,
          archivo_xml_key VARCHAR(500),
          archivo_pdf_key VARCHAR(500),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_facturas_estado_dian ON "${schemaName}".facturas_fiscales(estado_dian);
        CREATE INDEX IF NOT EXISTS idx_facturas_consecutivo ON "${schemaName}".facturas_fiscales(consecutivo);
      `);

      // 10. Documentos contables generales (compatibilidad)
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".documentos_contables (
          id UUID PRIMARY KEY,
          tipo_documento VARCHAR(50) NOT NULL,
          numero_consecutivo VARCHAR(50) NOT NULL,
          fecha_emision DATE NOT NULL,
          tercero_nit VARCHAR(50) NOT NULL,
          tercero_nombre VARCHAR(255) NOT NULL,
          total_monto NUMERIC(18, 4) NOT NULL DEFAULT 0,
          archivo_id UUID REFERENCES "${schemaName}".archivos(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // 11. Datos Semilla Iniciales Universales y Realistas para Pruebas Completas
      await this.seedUniversalTenantData(client, schemaName);

      await client.query('COMMIT');
      logger.info({ schemaName }, 'Esquema de tenant aprovisionado con ERP, POS y RBAC exitosamente');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, schemaName }, 'Error al aprovisionar esquema de tenant');
      throw new TenantSchemaError(schemaName, error);
    } finally {
      client.release();
    }
  }

  /**
   * Carga fixtures estándar y realistas (Figma compliant) para panaderías, mercados, bares y restaurantes
   */
  private static async seedUniversalTenantData(client: any, schemaName: string): Promise<void> {
    // A. Permisos Granulares del Sistema
    await client.query(`
      INSERT INTO "${schemaName}".permisos (id, modulo, codigo, nombre, descripcion) VALUES
      ('perm_pos_comanda_crear', 'POS', 'pos.comanda.crear', 'Crear Comanda', 'Permite abrir y agregar items a una comanda o venta'),
      ('perm_pos_comanda_cobrar', 'POS', 'pos.comanda.cobrar', 'Cobrar Comanda', 'Permite registrar pago y liquidar ventas'),
      ('perm_pos_comanda_anular', 'POS', 'pos.comanda.anular', 'Anular Comanda', 'Permite cancelar comandas activas'),
      ('perm_pos_descuento_aplicar', 'POS', 'pos.descuento.aplicar', 'Aplicar Descuentos', 'Autoriza descuentos manuales en caja'),
      ('perm_pos_mesas_gestionar', 'POS', 'pos.mesas.gestionar', 'Gestionar Mesas', 'Mover, unir y dividir cuentas de mesa'),
      
      ('perm_kds_monitor_ver', 'KDS', 'kds.monitor.ver', 'Ver Monitor KDS', 'Visualizar pantalla de preparación en cocina o barra'),
      ('perm_kds_estado_actualizar', 'KDS', 'kds.estado.actualizar', 'Actualizar Estado KDS', 'Marcar platos en preparación o despachados'),
      
      ('perm_catalogo_ver', 'INVENTARIO', 'catalogo.ver', 'Ver Catálogo', 'Consultar productos, precios y stock'),
      ('perm_catalogo_editar', 'INVENTARIO', 'catalogo.editar', 'Editar Catálogo', 'Crear y modificar productos, precios e impuestos'),
      ('perm_inventario_ajustar', 'INVENTARIO', 'inventario.ajustar', 'Ajustar Inventario', 'Registrar mermas, entradas y kardex'),
      
      ('perm_fact_emitir_dian', 'FACTURACION', 'facturacion.emitir', 'Emitir Factura DIAN', 'Generar factura electrónica con CUFE'),
      ('perm_fact_reportes_ver', 'FACTURACION', 'facturacion.reportes.ver', 'Ver Reportes Facturación', 'Consultar mallas de facturas y reportes de caja'),
      
      ('perm_cont_declaraciones_ver', 'CONTABILIDAD', 'contabilidad.declaraciones.ver', 'Ver Declaraciones DIAN', 'Consultar F-300, F-350, F-110'),
      ('perm_cont_asientos_crear', 'CONTABILIDAD', 'contabilidad.asientos.crear', 'Crear Asientos Contables', 'Registrar movimientos contables'),
      
      ('perm_usuarios_gestionar', 'USUARIOS_ROLES', 'usuarios.gestionar', 'Gestionar Usuarios', 'Crear cajeros, meseros y asignar PIN'),
      ('perm_roles_personalizar', 'USUARIOS_ROLES', 'roles.personalizar', 'Personalizar Roles', 'Modificar y crear roles con permisos a medida')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // B. Roles Predefinidos del Sistema (Personalizables y Escalables)
    await client.query(`
      INSERT INTO "${schemaName}".roles (id, nombre, slug, descripcion, es_sistema, activo) VALUES
      ('rol_super_admin', 'Super Administrador', 'super_admin', 'Acceso total y control maestro de la plataforma', true, true),
      ('rol_admin_negocio', 'Administrador de Empresa', 'admin_negocio', 'Gestión general del negocio, contabilidad y personal', true, true),
      ('rol_gerente_operativo', 'Gerente Operativo', 'gerente_operativo', 'Supervisión de sala, cortes de caja y KDS', true, true),
      ('rol_cajero', 'Cajero / Punto de Venta', 'cajero', 'Operación de caja, cobro y facturación rápida', true, true),
      ('rol_mesero', 'Mesero / Atención de Sala', 'mesero', 'Toma de pedidos en mesa y despacho de comandas', true, true),
      ('rol_cocinero', 'Jefe de Cocina / KDS', 'cocinero', 'Control y despacho de órdenes en monitor de preparación', true, true),
      ('rol_contador', 'Contador / Revisor Fiscal', 'contador', 'Gestión contable, declaraciones DIAN y exógena', true, true)
      ON CONFLICT (slug) DO NOTHING;
    `);

    // C. Mapeo de Permisos a Roles
    await client.query(`
      -- Cajero
      INSERT INTO "${schemaName}".rol_permisos (rol_id, permiso_id) VALUES
      ('rol_cajero', 'perm_pos_comanda_crear'),
      ('rol_cajero', 'perm_pos_comanda_cobrar'),
      ('rol_cajero', 'perm_catalogo_ver'),
      ('rol_cajero', 'perm_fact_emitir_dian')
      ON CONFLICT DO NOTHING;

      -- Mesero
      INSERT INTO "${schemaName}".rol_permisos (rol_id, permiso_id) VALUES
      ('rol_mesero', 'perm_pos_comanda_crear'),
      ('rol_mesero', 'perm_pos_mesas_gestionar'),
      ('rol_mesero', 'perm_catalogo_ver')
      ON CONFLICT DO NOTHING;

      -- Cocinero
      INSERT INTO "${schemaName}".rol_permisos (rol_id, permiso_id) VALUES
      ('rol_cocinero', 'perm_kds_monitor_ver'),
      ('rol_cocinero', 'perm_kds_estado_actualizar')
      ON CONFLICT DO NOTHING;

      -- Contador
      INSERT INTO "${schemaName}".rol_permisos (rol_id, permiso_id) VALUES
      ('rol_contador', 'perm_fact_reportes_ver'),
      ('rol_contador', 'perm_cont_declaraciones_ver'),
      ('rol_contador', 'perm_cont_asientos_crear')
      ON CONFLICT DO NOTHING;
    `);

    // D. Áreas Operativas Universales
    await client.query(`
      INSERT INTO "${schemaName}".areas_operativas (id, nombre, descripcion) VALUES
      ('area_salon', 'Salón Principal', 'Mesas de atención y salón general'),
      ('area_barra', 'Barra y Bebidas', 'Atención rápida en barra'),
      ('area_cajas', 'Mostrador y Cajas', 'Punto de cobro rápido y escaneo de productos'),
      ('area_vitrina', 'Vitrina Take-Away', 'Despacho al paso y productos de vitrina')
      ON CONFLICT (id) DO NOTHING;
    `);

    // E. Puntos de Atención (Mesas / Cajas / Vitrinas)
    await client.query(`
      INSERT INTO "${schemaName}".puntos_atencion (id, area_id, nombre, codigo, tipo, capacidad, estado) VALUES
      ('pto_m1', 'area_salon', 'Mesa 01', 'M-01', 'MESA', 4, 'LIBRE'),
      ('pto_m2', 'area_salon', 'Mesa 02', 'M-02', 'MESA', 4, 'OCUPADO'),
      ('pto_m3', 'area_salon', 'Mesa 03', 'M-03', 'MESA', 6, 'LIBRE'),
      ('pto_caja1', 'area_cajas', 'Caja Mostrador 01', 'CJ-01', 'MOSTRADOR', 1, 'LIBRE'),
      ('pto_vitrina1', 'area_vitrina', 'Vitrina Despacho', 'VT-01', 'VITRINA', 1, 'LIBRE')
      ON CONFLICT (id) DO NOTHING;
    `);

    // F. Usuarios Demostrativos con PIN (Carlos Mendoza PIN 123456 como en Figma)
    await client.query(`
      INSERT INTO "${schemaName}".usuarios (id, nombre, email, pin_seguridad, rol_id, area_asignada_id, activo) VALUES
      ('usr_carlos', 'Carlos Mendoza', 'carlos.mendoza@nucleo.co', '123456', 'rol_super_admin', 'area_salon', true),
      ('usr_laura', 'Laura Gómez', 'laura.caja@nucleo.co', '112233', 'rol_cajero', 'area_cajas', true),
      ('usr_david', 'David Rueda', 'david.salon@nucleo.co', '445566', 'rol_mesero', 'area_salon', true),
      ('usr_roberto', 'Chef Roberto Díaz', 'chef.roberto@nucleo.co', '778899', 'rol_cocinero', 'area_barra', true),
      ('usr_maria', 'María Fernanda Ortiz', 'maria.contable@nucleo.co', '998877', 'rol_contador', NULL, true)
      ON CONFLICT (email) DO NOTHING;
    `);

    // G. Categorías Universales
    await client.query(`
      INSERT INTO "${schemaName}".categorias (id, nombre, icono, color, orden) VALUES
      ('cat_entradas', 'Entradas y Aperitivos', 'utensils', '#f59e0b', 1),
      ('cat_fuertes', 'Platos Fuertes y Especiales', 'dinner', '#ef4444', 2),
      ('cat_bebidas', 'Bebidas e Hidratación', 'glass', '#3b82f6', 3),
      ('cat_cocteles', 'Licores y Cócteles', 'wine', '#8b5cf6', 4),
      ('cat_panaderia', 'Panadería y Pastelería', 'cake', '#d97706', 5),
      ('cat_abarrotes', 'Abarrotes y Despensa', 'shopping-cart', '#10b981', 6)
      ON CONFLICT (id) DO NOTHING;
    `);

    // H. Catálogo Universal de Productos (Mockup de Figma)
    await client.query(`
      INSERT INTO "${schemaName}".productos 
      (id, categoria_id, nombre, descripcion, precio_base, tipo_impuesto, unidad_medida, requiere_kds, stock_actual) VALUES
      ('p1', 'cat_entradas', 'Ceviche de Camarón', 'Camarones frescos maridados con cítricos', 28500, 'IMPOCONSUMO_8', 'UNIDAD', true, 18),
      ('p2', 'cat_entradas', 'Tabla de Antipasto', 'Selección de quesos y carnes curadas', 35000, 'IMPOCONSUMO_8', 'UNIDAD', false, 18),
      ('p3', 'cat_fuertes', 'Lomo al Trapo', 'Corte premium de lomo fino 350g', 68000, 'IMPOCONSUMO_8', 'UNIDAD', true, 18),
      ('p4', 'cat_fuertes', 'Salmón a la Plancha', 'Filete de salmón noruego con espárragos', 58500, 'IMPOCONSUMO_8', 'UNIDAD', true, 18),
      ('p5', 'cat_bebidas', 'Cerveza Artesanal IPA', 'Botella 330ml 6.5% ABV', 14000, 'IMPOCONSUMO_8', 'UNIDAD', false, 18),
      ('p6', 'cat_bebidas', 'Limonada de Coco', 'Bebida natural cremosa', 12500, 'IMPOCONSUMO_8', 'UNIDAD', true, 18),
      ('p7', 'cat_cocteles', 'Negroni Clásico', 'Gin, Campari, Vermouth Rosso', 28000, 'IMPOCONSUMO_8', 'UNIDAD', true, 18),
      ('p8', 'cat_cocteles', 'Maracuyá Sour', 'Pisco con pulpa natural', 24000, 'IMPOCONSUMO_8', 'UNIDAD', true, 18),
      ('p9', 'cat_panaderia', 'Croissant de Almendras', 'Hojaldre artesanal con crema de almendras', 7500, 'IVA_19', 'UNIDAD', false, 30),
      ('p10', 'cat_abarrotes', 'Café Especial Origen 500g', 'Café tostado en grano origen Huila', 32000, 'EXENTO', 'UNIDAD', false, 40)
      ON CONFLICT (id) DO NOTHING;
    `);

    // I. Directorio de Terceros / Clientes DIAN Realistas (Mockup Figma)
    await client.query(`
      INSERT INTO "${schemaName}".terceros 
      (numero_documento, razon_social, email, es_cliente) VALUES
      ('222222222222', 'Consumidor Final', 'facturacion@empresa.co', true),
      ('900.123.456-7', 'Grupo Empresarial Torres S.A.S.', 'pagos@grupotorres.com', true),
      ('800.987.654-3', 'Distribuidora Andina Ltda.', 'contabilidad@andina.com.co', true),
      ('901.555.777-2', 'Constructora Bogotá S.A.', 'facturas@constructora.com', true),
      ('890.222.333-4', 'Inversiones del Pacífico S.A.S.', 'admin@inverpacifico.com', true),
      ('830.444.555-6', 'Logística Express Colombia', 'finanzas@logisticaexpress.co', true),
      ('812.666.777-8', 'Agropecuaria Las Palmas', 'tesoreria@laspalmas.co', true),
      ('901.662.104-2', 'Café Central S.A.S.', 'contacto@cafecentral.co', true),
      ('900.741.225-1', 'Mercados La 18', 'gerencia@mercadosla18.com', true),
      ('901.332.558-9', 'Panadería El Nogal', 'compras@elnogalpan.com', true),
      ('830.901.114-5', 'Droguerías Salud Total', 'facturacion@saludtotal.co', true),
      ('901.445.772-0', 'Restaurante Origen', 'info@restauranteorigen.com', true)
      ON CONFLICT (numero_documento) DO NOTHING;
    `);

    // J. Malla Completa de Facturas Electrónicas DIAN Realistas (FE-2026-0891 a 0901 del mockup Figma)
    await client.query(`
      INSERT INTO "${schemaName}".facturas_fiscales (
        id, prefijo, consecutivo, numero_completo, tipo_documento,
        fecha_emision, fecha_vencimiento, cliente_nombre, cliente_nit,
        base_gravable, total_iva, total_impoconsumo, propina, total_pagar,
        estado_dian, cufe
      ) VALUES
      ('f-891', 'FE-2026', 891, 'FE-2026-0891', 'FACTURA_ELECTRONICA_DIAN', '2026-10-01', '2026-10-31', 'Grupo Empresarial Torres S.A.S.', 'NIT 900.123.456-7', 4800000, 912000, 0, 0, 5712000, 'ACEPTADA', 'CUFE-2026-891-AA1B2C'),
      ('f-892', 'FE-2026', 892, 'FE-2026-0892', 'FACTURA_ELECTRONICA_DIAN', '2026-10-03', '2026-11-02', 'Distribuidora Andina Ltda.', 'NIT 800.987.654-3', 12500000, 2375000, 0, 0, 14875000, 'PENDIENTE', 'CUFE-2026-892-BB2C3D'),
      ('f-893', 'FE-2026', 893, 'FE-2026-0893', 'FACTURA_ELECTRONICA_DIAN', '2026-10-05', '2026-11-04', 'Constructora Bogotá S.A.', 'NIT 901.555.777-2', 7200000, 1368000, 0, 0, 8568000, 'RECHAZADA_DIAN', 'CUFE-2026-893-CC3D4E'),
      ('f-894', 'FE-2026', 894, 'FE-2026-0894', 'FACTURA_ELECTRONICA_DIAN', '2026-10-06', '2026-11-05', 'Inversiones del Pacífico S.A.S.', 'NIT 890.222.333-4', 3100000, 589000, 0, 0, 3689000, 'ACEPTADA', 'CUFE-2026-894-DD4E5F'),
      ('f-895', 'FE-2026', 895, 'FE-2026-0895', 'FACTURA_ELECTRONICA_DIAN', '2026-10-07', '2026-11-06', 'Logística Express Colombia', 'NIT 830.444.555-6', 9750000, 1852500, 0, 0, 11602500, 'PENDIENTE', 'CUFE-2026-895-EE5F6G'),
      ('f-896', 'FE-2026', 896, 'FE-2026-0896', 'FACTURA_ELECTRONICA_DIAN', '2026-10-08', '2026-11-07', 'Agropecuaria Las Palmas', 'NIT 812.666.777-8', 6300000, 1197000, 0, 0, 7497000, 'ACEPTADA', 'CUFE-2026-896-FF6G7H'),
      ('f-897', 'FE-2026', 897, 'FE-2026-0897', 'FACTURA_ELECTRONICA_DIAN', '2026-10-09', '2026-10-24', 'Café Central S.A.S.', 'NIT 901.662.104-2', 2850000, 541500, 0, 0, 3391500, 'PAGO_PARCIAL', 'CUFE-2026-897-GG7H8I'),
      ('f-898', 'FE-2026', 898, 'FE-2026-0898', 'FACTURA_ELECTRONICA_DIAN', '2026-09-02', '2026-10-02', 'Mercados La 18', 'NIT 900.741.225-1', 8100000, 1539000, 0, 0, 9639000, 'VENCIDA', 'CUFE-2026-898-HH8I9J'),
      ('f-899', 'FE-2026', 899, 'FE-2026-0899', 'FACTURA_ELECTRONICA_DIAN', '2026-10-10', '2026-11-09', 'Panadería El Nogal', 'NIT 901.332.558-9', 1980000, 376200, 0, 0, 2356200, 'PENDIENTE', 'CUFE-2026-899-II9J0K'),
      ('f-900', 'FE-2026', 900, 'FE-2026-0900', 'FACTURA_ELECTRONICA_DIAN', '2026-10-10', '2026-11-09', 'Droguerías Salud Total', 'NIT 830.901.114-5', 5400000, 1026000, 0, 0, 6426000, 'ACEPTADA', 'CUFE-2026-900-JJ0K1L'),
      ('f-901', 'FE-2026', 901, 'FE-2026-0901', 'FACTURA_ELECTRONICA_DIAN', '2026-10-11', '2026-11-10', 'Restaurante Origen', 'NIT 901.445.772-0', 3750000, 712500, 0, 0, 4462500, 'ANULADA', 'CUFE-2026-901-KK1L2M')
      ON CONFLICT (numero_completo) DO NOTHING;
    `);

    // K. Comanda y Pedidos en Cola KDS (Mesa 02 del Figma)
    await client.query(`
      INSERT INTO "${schemaName}".ventas_comandas (
        id, numero_comanda, modo_atencion, punto_atencion_id, estado,
        cliente_nombre, cliente_nit, subtotal, descuento, propina_sugerida,
        impuesto_consumo, iva, total, created_at
      ) VALUES (
        'cmd_mesa_02', 'CMD-000002', 'MESA_SERVICIO', 'pto_m2', 'EN_PREPARACION',
        'Consumidor Final', '222222222222', 87000, 0, 8700, 6960, 0, 102660, NOW() - INTERVAL '15 minutes'
      ) ON CONFLICT (numero_comanda) DO NOTHING;

      INSERT INTO "${schemaName}".items_comanda (
        id, comanda_id, producto_id, nombre_producto, cantidad, precio_unitario,
        tipo_impuesto, notas_cocina, requiere_kds, estado_preparacion
      ) VALUES
      ('it_kds_1', 'cmd_mesa_02', 'p1', 'Ceviche de Camarón', 1, 28500, 'IMPOCONSUMO_8', 'Sin picante', true, 'EN_COCINA'),
      ('it_kds_2', 'cmd_mesa_02', 'p4', 'Salmón a la Plancha', 1, 58500, 'IMPOCONSUMO_8', 'Término medio con espárragos', true, 'PENDIENTE')
      ON CONFLICT (id) DO NOTHING;
    `);
  }
}

