import { describe, it, expect } from 'vitest';
import { ConversionUnidadesService } from '../src/domain/services/conversion-unidades.service.js';
import { Producto, Categoria } from '../src/domain/entities/catalogo.entity.js';
import { ProductoVariante } from '../src/domain/entities/producto-variante.entity.js';
import { ListaPrecio, PrecioProducto } from '../src/domain/entities/lista-precio.entity.js';
import { ProveedorProducto } from '../src/domain/entities/proveedor-producto.entity.js';
import { Tercero } from '../src/domain/entities/tercero.entity.js';
import { MovimientoInventario, LoteInventario, AjusteInventario, AjusteItem } from '../src/domain/entities/inventario.entity.js';
import { OrdenCompra, OrdenCompraItem, RecepcionCompra, RecepcionItem, CuentaPorPagar } from '../src/domain/entities/compras.entity.js';
import { Sucursal } from '../src/domain/entities/sucursal.entity.js';
import { Bodega } from '../src/domain/entities/bodega.entity.js';

describe('🏛️ Módulos de Catálogo, Inventario y Proveedores', () => {
  describe('1. Servicio de Conversión de Unidades de Medida', () => {
    it('debe convertir unidades de volumen correctamente (1 Litro = 1000 ml)', () => {
      const ml = ConversionUnidadesService.convertir(1, 'LITRO', 'ML');
      expect(ml).toBe(1000);

      const litros = ConversionUnidadesService.convertir(2500, 'ML', 'LITRO');
      expect(litros).toBe(2.5);
    });

    it('debe convertir unidades de masa correctamente (1 KG = 1000 g)', () => {
      const gramos = ConversionUnidadesService.convertir(1.5, 'KG', 'G');
      expect(gramos).toBe(1500);

      const kilos = ConversionUnidadesService.convertir(500, 'G', 'KG');
      expect(kilos).toBe(0.5);
    });

    it('debe validar compatibilidad física entre unidades', () => {
      expect(ConversionUnidadesService.sonCompatibles('LITRO', 'ML')).toBe(true);
      expect(ConversionUnidadesService.sonCompatibles('KG', 'G')).toBe(true);
      expect(ConversionUnidadesService.sonCompatibles('LITRO', 'KG')).toBe(false);
      expect(ConversionUnidadesService.sonCompatibles('UNIDAD', 'METRO')).toBe(false);
    });

    it('debe rechazar conversiones incompatibles sin densidad', () => {
      expect(() => {
        ConversionUnidadesService.convertir(1, 'LITRO', 'KG');
      }).toThrow();
    });

    it('debe aplicar factores de conversión personalizados para empaques', () => {
      // 1 Caja = 24 unidades
      const unidadesEn5Cajas = ConversionUnidadesService.aplicarFactor(5, 24);
      expect(unidadesEn5Cajas).toBe(120);
    });
  });

  describe('2. Entidades de Catálogo, Variantes y Listas de Precios', () => {
    it('debe crear un producto con soporte de imágenes, marcas y unidades de compra', () => {
      const prod = new Producto({
        id: 'prod_leche_01',
        categoriaId: 'cat_lacteos',
        nombre: 'Leche Entera Alquería',
        sku: 'ALQ-LE-1L',
        codigoBarras: '7702001002003',
        precioBase: 4200,
        costo: 3100,
        tipoImpuesto: 'EXENTO',
        unidadMedida: 'LITRO',
        marca: 'Alquería',
        tieneLotes: true,
        tieneVencimiento: true,
        unidadMedidaCompra: 'CAJA',
        factorConversionCompra: 12, // 1 caja = 12 litros
      });

      expect(prod.id).toBe('prod_leche_01');
      expect(prod.marca).toBe('Alquería');
      expect(prod.tieneVencimiento).toBe(true);
      expect(prod.factorConversionCompra).toBe(12);
    });

    it('debe modelar variantes del mismo producto sin duplicar registros base', () => {
      const variantePint = new ProductoVariante({
        id: 'var_leche_500ml',
        productoId: 'prod_leche_01',
        nombre: 'Bolsa 500ml',
        sku: 'ALQ-LE-500ML',
        unidadMedida: 'ML',
        factorConversion: 0.5,
        precioBase: 2400,
        costo: 1700,
      });

      expect(variantePint.productoId).toBe('prod_leche_01');
      expect(variantePint.factorConversion).toBe(0.5);
      expect(variantePint.precioBase).toBe(2400);
    });

    it('debe soportar listas de precios diferenciadas (Público vs Mayorista)', () => {
      const listaMayorista = new ListaPrecio({
        id: 'lp_mayorista',
        nombre: 'Tarifa Mayorista B2B',
      });

      const precioMayorista = new PrecioProducto({
        id: 'pr_01',
        listaPrecioId: listaMayorista.id,
        productoId: 'prod_leche_01',
        precio: 3600,
        descuentoMaximo: 5,
      });

      expect(precioMayorista.precio).toBe(3600);
      expect(precioMayorista.descuentoMaximo).toBe(5);
    });
  });

  describe('3. Relación Multi-Proveedor (M:N)', () => {
    it('debe permitir que múltiples proveedores suministren el mismo producto con diferentes costos', () => {
      const prov1 = new ProveedorProducto({
        id: 'rel_01',
        proveedorId: 'prov_colanta',
        productoId: 'prod_leche_01',
        precioCompra: 3050,
        tiempoEntregaDias: 2,
        esProveedorPrincipal: true,
      });

      const prov2 = new ProveedorProducto({
        id: 'rel_02',
        proveedorId: 'prov_alqueria_directo',
        productoId: 'prod_leche_01',
        precioCompra: 3000,
        tiempoEntregaDias: 5,
        esProveedorPrincipal: false,
      });

      expect(prov1.productoId).toBe('prod_leche_01');
      expect(prov2.productoId).toBe('prod_leche_01');
      expect(prov1.precioCompra).not.toBe(prov2.precioCompra);
      expect(prov1.esProveedorPrincipal).toBe(true);
    });
  });

  describe('4. Sucursales, Bodegas e Inventario Multi-Almacén', () => {
    it('debe modelar sucursales y bodegas asociadas', () => {
      const sucursal = new Sucursal({
        id: 'suc_calle80',
        nombre: 'Sede Norte Calle 80',
        codigo: 'SEDE-N80',
      });

      const bodegaPrincipal = new Bodega({
        id: 'bod_norte_p',
        sucursalId: sucursal.id,
        nombre: 'Bodega Principal Norte',
        codigo: 'BOD-N80-P',
        tipo: 'PRINCIPAL',
      });

      expect(bodegaPrincipal.sucursalId).toBe('suc_calle80');
      expect(bodegaPrincipal.tipo).toBe('PRINCIPAL');
    });

    it('debe modelar movimientos de Kardex con trazabilidad completa de saldos', () => {
      const mov = new MovimientoInventario({
        id: 'mov_001',
        productoId: 'prod_leche_01',
        bodegaId: 'bod_norte_p',
        tipo: 'ENTRADA',
        cantidad: 100,
        costoUnitario: 3000,
        saldoAnterior: 50,
        saldoNuevo: 150,
        referenciaDocumento: 'REC-00001',
        referenciaTipo: 'RECEPCION_COMPRA',
      });

      expect(mov.saldoNuevo - mov.saldoAnterior).toBe(100);
      expect(mov.tipo).toBe('ENTRADA');
    });

    it('debe controlar lotes con fechas de vencimiento', () => {
      const lote = new LoteInventario({
        id: 'lot_01',
        productoId: 'prod_leche_01',
        bodegaId: 'bod_norte_p',
        numeroLote: 'L-2026-11-A',
        fechaVencimiento: new Date('2026-11-20'),
        cantidadInicial: 200,
        cantidadDisponible: 180,
      });

      expect(lote.numeroLote).toBe('L-2026-11-A');
      expect(lote.cantidadDisponible).toBe(180);
    });

    it('debe modelar ajustes de inventario con diferencias de conteo físico', () => {
      const itemAjuste = new AjusteItem({
        id: 'it_aj_01',
        ajusteId: 'aj_01',
        productoId: 'prod_leche_01',
        cantidadSistema: 100,
        cantidadFisica: 96,
        diferencia: -4, // Merma o pérdida de 4 unidades
        costoUnitario: 3000,
      });

      const ajuste = new AjusteInventario({
        id: 'aj_01',
        bodegaId: 'bod_norte_p',
        numero: 'AJ-00001',
        tipo: 'MERMA',
        observaciones: 'Pérdida por rotura en estiba',
        items: [itemAjuste],
      });

      expect(ajuste.items[0].diferencia).toBe(-4);
      expect(ajuste.estado).toBe('PENDIENTE');
    });
  });

  describe('5. Compras y Cuentas por Pagar a Proveedores', () => {
    it('debe modelar flujo de orden de compra y cuentas por pagar', () => {
      const itemOC = new OrdenCompraItem({
        id: 'oci_01',
        ordenId: 'oc_001',
        productoId: 'prod_leche_01',
        productoNombre: 'Leche Entera Alquería',
        cantidadSolicitada: 500,
        precioUnitario: 3000,
      });

      const oc = new OrdenCompra({
        id: 'oc_001',
        proveedorId: 'prov_colanta',
        bodegaDestinoId: 'bod_norte_p',
        numero: 'OC-00001',
        subtotal: 1500000,
        impuestos: 0,
        total: 1500000,
        items: [itemOC],
      });

      expect(oc.total).toBe(1500000);
      expect(oc.items.length).toBe(1);

      const cxp = new CuentaPorPagar({
        id: 'cxp_001',
        proveedorId: 'prov_colanta',
        ordenCompraId: oc.id,
        facturaProveedorNumero: 'FACT-COL-99881',
        monto: 1500000,
        saldo: 1500000,
        estado: 'PENDIENTE',
      });

      expect(cxp.saldo).toBe(1500000);
      expect(cxp.estado).toBe('PENDIENTE');
    });

    it('debe soportar la entidad Tercero con atributos fiscales y bancarios colombianos', () => {
      const proveedor = new Tercero({
        id: 'tercero_colanta',
        tipoDocumento: 'NIT',
        numeroDocumento: '890.900.286-0',
        razonSocial: 'Cooperativa Colanta',
        tipoContribuyente: 'GRAN_CONTRIBUYENTE',
        aplicaReteFuente: true,
        tarifaReteFuente: 0.025,
        banco: 'Bancolombia',
        tipoCuenta: 'CORRIENTE',
        numeroCuenta: '123-456789-00',
        plazoPagoDias: 30,
        esCliente: false,
        esProveedor: true,
      });

      expect(proveedor.esProveedor).toBe(true);
      expect(proveedor.aplicaReteFuente).toBe(true);
      expect(proveedor.tarifaReteFuente).toBe(0.025);
      expect(proveedor.banco).toBe('Bancolombia');
      expect(proveedor.plazoPagoDias).toBe(30);
    });
  });
});

