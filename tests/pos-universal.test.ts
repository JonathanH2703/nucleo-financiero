import { describe, it, expect } from 'vitest';
import { Producto } from '../src/domain/entities/catalogo.entity.js';
import { PuntoAtencion } from '../src/domain/entities/operacion.entity.js';
import { Comanda, ItemComanda } from '../src/domain/entities/pos.entity.js';

describe('Universal POS & ERP Domain Tests', () => {
  describe('Cálculo de Impuestos por Producto (DIAN / Fiscal Colombiano)', () => {
    it('debe calcular Impoconsumo del 8% para platos de restaurante o licores', () => {
      const plato = new Producto({
        id: 'p-1',
        categoriaId: 'cat-fuertes',
        nombre: 'Lomo al Trapo',
        precioBase: 50000,
        tipoImpuesto: 'IMPOCONSUMO_8',
        requiereKds: true,
      });

      const imp = plato.calcularImpuesto(plato.precioBase);
      expect(imp.tipo).toBe('IMPOCONSUMO_8');
      expect(imp.monto).toBe(4000); // 50.000 * 0.08
    });

    it('debe calcular IVA del 19% para panadería especial y productos gravados', () => {
      const pan = new Producto({
        id: 'p-2',
        categoriaId: 'cat-panaderia',
        nombre: 'Croissant Almendras',
        precioBase: 10000,
        tipoImpuesto: 'IVA_19',
        requiereKds: false,
      });

      const imp = pan.calcularImpuesto(pan.precioBase);
      expect(imp.tipo).toBe('IVA_19');
      expect(imp.monto).toBe(1900); // 10.000 * 0.19
    });

    it('debe calcular 0 impuestos para productos exentos (ej. café en grano / abarrotes)', () => {
      const cafe = new Producto({
        id: 'p-3',
        categoriaId: 'cat-abarrotes',
        nombre: 'Café Especial 500g',
        precioBase: 25000,
        tipoImpuesto: 'EXENTO',
      });

      const imp = cafe.calcularImpuesto(cafe.precioBase);
      expect(imp.tipo).toBe('EXENTO');
      expect(imp.monto).toBe(0);
    });
  });

  describe('Comanda y Venta Universal (Panadería, Mercado, Bar, Restaurante)', () => {
    it('debe calcular subtotales, discriminación tributaria múltiple y propina voluntaria sugerida (10%)', () => {
      const item1 = new ItemComanda({
        id: 'it-1',
        comandaId: 'cmd-1',
        productoId: 'p-1',
        nombreProducto: 'Ceviche de Camarón',
        cantidad: 2,
        precioUnitario: 20000,
        tipoImpuesto: 'IMPOCONSUMO_8',
        requiereKds: true,
      }); // Subtotal 40.000, Impoconsumo: 3.200

      const item2 = new ItemComanda({
        id: 'it-2',
        comandaId: 'cmd-1',
        productoId: 'p-2',
        nombreProducto: 'Croissant Especial',
        cantidad: 1,
        precioUnitario: 10000,
        tipoImpuesto: 'IVA_19',
        requiereKds: false,
      }); // Subtotal 10.000, IVA 19%: 1.900

      const comanda = new Comanda({
        id: 'cmd-1',
        numeroComanda: 'CMD-1001',
        modoAtencion: 'MESA_SERVICIO',
        puntoAtencionId: 'pto-m1',
        puntoAtencionNombre: 'Mesa 01',
        descuento: 0,
        incluyePropina: true,
        porcentajePropina: 10,
        items: [item1, item2],
      });

      // Subtotal = 40.000 + 10.000 = 50.000
      expect(comanda.subtotal).toBe(50000);
      expect(comanda.baseGravable).toBe(50000);

      // Impuestos discriminados
      const impuestos = comanda.totalImpuestos;
      expect(impuestos.impoconsumo8).toBe(3200);
      expect(impuestos.iva19).toBe(1900);
      expect(impuestos.total).toBe(5100);

      // Propina sugerida 10% sobre base = 5.000
      expect(comanda.propinaSugerida).toBe(5000);

      // Total general = 50.000 + 5.100 + 5.000 = 60.100
      expect(comanda.total).toBe(60100);
    });

    it('debe filtrar exclusivamente los items que requieren KDS para cocina/barra', () => {
      const itemCocina = new ItemComanda({
        id: 'it-1',
        comandaId: 'cmd-2',
        productoId: 'p-1',
        nombreProducto: 'Salmón a la Plancha',
        cantidad: 1,
        precioUnitario: 58500,
        tipoImpuesto: 'IMPOCONSUMO_8',
        requiereKds: true,
        notasCocina: 'Término medio sin sal',
      });

      const itemDirecto = new ItemComanda({
        id: 'it-2',
        comandaId: 'cmd-2',
        productoId: 'p-2',
        nombreProducto: 'Gaseosa Postobón 350ml',
        cantidad: 2,
        precioUnitario: 5000,
        tipoImpuesto: 'IVA_19',
        requiereKds: false,
      });

      const comanda = new Comanda({
        id: 'cmd-2',
        numeroComanda: 'CMD-1002',
        modoAtencion: 'MOSTRADOR_ESCANER',
        items: [itemCocina, itemDirecto],
      });

      const kdsItems = comanda.itemsRequierenKds;
      expect(kdsItems.length).toBe(1);
      expect(kdsItems[0].nombreProducto).toBe('Salmón a la Plancha');
      expect(kdsItems[0].notasCocina).toBe('Término medio sin sal');
    });
  });

  describe('Puntos de Atención Operativos (Mesas, Cajas, Vitrinas)', () => {
    it('debe transicionar estados operacionales de forma coherente', () => {
      const mesa = new PuntoAtencion({
        id: 'pto-1',
        areaId: 'area-salon',
        nombre: 'Mesa 04',
        codigo: 'M-04',
        tipo: 'MESA',
        capacidad: 4,
      });

      expect(mesa.estado).toBe('LIBRE');

      mesa.ocupar();
      expect(mesa.estado).toBe('OCUPADO');

      mesa.solicitarCuenta();
      expect(mesa.estado).toBe('ESPERANDO_CUENTA');

      mesa.liberar();
      expect(mesa.estado).toBe('LIBRE');
    });
  });
});
