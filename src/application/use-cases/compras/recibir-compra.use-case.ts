import { v4 as uuidv4 } from 'uuid';
import { IComprasRepository } from '../../../domain/repositories/compras.repository.interface.js';
import { IInventarioRepository } from '../../../domain/repositories/inventario.repository.interface.js';
import { ITerceroRepository } from '../../../domain/repositories/tercero.repository.interface.js';
import { RecepcionCompra, RecepcionItem, CuentaPorPagar } from '../../../domain/entities/compras.entity.js';
import { MovimientoInventario, LoteInventario } from '../../../domain/entities/inventario.entity.js';

export class RecibirCompraUseCase {
  constructor(
    private readonly comprasRepo: IComprasRepository,
    private readonly inventarioRepo: IInventarioRepository,
    private readonly terceroRepo: ITerceroRepository
  ) { }

  public async execute(
    schemaName: string,
    data: {
      ordenCompraId?: string;
      proveedorId: string;
      bodegaId: string;
      facturaProveedorNumero?: string;
      recibidoPor?: string;
      notas?: string;
      items: {
        productoId: string;
        varianteId?: string;
        cantidadRecibida: number;
        costoUnitario: number;
        loteNumero?: string;
        fechaVencimiento?: Date;
      }[];
    }
  ): Promise<{ recepcion: RecepcionCompra; cuentaPorPagar: CuentaPorPagar }> {
    if (!data.proveedorId) throw new Error('El proveedor es obligatorio.');
    if (!data.bodegaId) throw new Error('La bodega es obligatoria.');
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe recibir al menos un producto.');
    }

    const proveedor = await this.terceroRepo.getById(schemaName, data.proveedorId);
    const recepcionId = `rec_${uuidv4().substring(0, 8)}`;
    const numero = await this.comprasRepo.getNextNumeroRecepcion(schemaName);

    let montoTotal = 0;
    const recepcionItems: RecepcionItem[] = [];

    // 1. Procesar items y registrar movimientos de inventario en Kardex
    for (const item of data.items) {
      const itemMonto = item.cantidadRecibida * item.costoUnitario;
      montoTotal += itemMonto;

      let loteId: string | undefined = undefined;

      // Si tiene número de lote, registrar lote
      if (item.loteNumero) {
        loteId = `lote_${uuidv4().substring(0, 8)}`;
        await this.inventarioRepo.crearLote(
          schemaName,
          new LoteInventario({
            id: loteId,
            productoId: item.productoId,
            varianteId: item.varianteId,
            bodegaId: data.bodegaId,
            numeroLote: item.loteNumero,
            fechaVencimiento: item.fechaVencimiento,
            cantidadInicial: item.cantidadRecibida,
            cantidadDisponible: item.cantidadRecibida,
            costoUnitario: item.costoUnitario,
          })
        );
      }

      // Registrar movimiento de ENTRADA en Kardex
      await this.inventarioRepo.registrarMovimiento(
        schemaName,
        new MovimientoInventario({
          id: `mov_rec_${uuidv4().substring(0, 8)}`,
          productoId: item.productoId,
          varianteId: item.varianteId,
          bodegaId: data.bodegaId,
          tipo: 'ENTRADA',
          cantidad: item.cantidadRecibida,
          costoUnitario: item.costoUnitario,
          saldoAnterior: 0,
          saldoNuevo: 0,
          loteId,
          referenciaDocumento: numero,
          referenciaTipo: 'RECEPCION_COMPRA',
          notas: `Recepción de compra ${data.facturaProveedorNumero ? `Factura ${data.facturaProveedorNumero}` : ''}`,
          creadoPor: data.recibidoPor,
        })
      );

      recepcionItems.push(
        new RecepcionItem({
          id: `reci_${uuidv4().substring(0, 8)}`,
          recepcionId,
          productoId: item.productoId,
          varianteId: item.varianteId,
          cantidadRecibida: item.cantidadRecibida,
          costoUnitario: item.costoUnitario,
          loteNumero: item.loteNumero,
          fechaVencimiento: item.fechaVencimiento,
        })
      );
    }

    // 2. Guardar recepción
    const recepcion = new RecepcionCompra({
      id: recepcionId,
      ordenCompraId: data.ordenCompraId,
      proveedorId: data.proveedorId,
      bodegaId: data.bodegaId,
      numero,
      recibidoPor: data.recibidoPor,
      notas: data.notas,
      items: recepcionItems,
    });
    await this.comprasRepo.createRecepcion(schemaName, recepcion);

    // 3. Crear Cuenta por Pagar al proveedor
    const plazoDias = proveedor ? proveedor.plazoPagoDias || 30 : 30;
    const fechaVencimiento = new Date(Date.now() + plazoDias * 24 * 60 * 60 * 1000);

    const cuentaPorPagar = new CuentaPorPagar({
      id: `cxp_${uuidv4().substring(0, 8)}`,
      proveedorId: data.proveedorId,
      proveedorNombre: proveedor ? proveedor.razonSocial : undefined,
      facturaProveedorNumero: data.facturaProveedorNumero,
      ordenCompraId: data.ordenCompraId,
      recepcionId,
      monto: montoTotal,
      saldo: montoTotal,
      fechaEmision: new Date(),
      fechaVencimiento,
      estado: 'PENDIENTE',
      notas: `Obligación generada por recepción ${numero}`,
    });

    await this.comprasRepo.createCuentaPorPagar(schemaName, cuentaPorPagar);

    return { recepcion, cuentaPorPagar };
  }
}

