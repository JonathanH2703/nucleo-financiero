import { v4 as uuidv4 } from 'uuid';
import { IComprasRepository } from '../../../domain/repositories/compras.repository.interface.js';
import { ITerceroRepository } from '../../../domain/repositories/tercero.repository.interface.js';
import { OrdenCompra, OrdenCompraItem } from '../../../domain/entities/compras.entity.js';

export class CreateOrdenCompraUseCase {
  constructor(
    private readonly comprasRepo: IComprasRepository,
    private readonly terceroRepo: ITerceroRepository
  ) { }

  public async execute(
    schemaName: string,
    data: {
      proveedorId: string;
      bodegaDestinoId: string;
      fechaEntregaEstimada?: Date;
      notas?: string;
      creadoPor?: string;
      items: {
        productoId: string;
        varianteId?: string;
        productoNombre: string;
        cantidadSolicitada: number;
        precioUnitario: number;
      }[];
    }
  ): Promise<OrdenCompra> {
    if (!data.proveedorId) throw new Error('El proveedor es obligatorio.');
    if (!data.bodegaDestinoId) throw new Error('La bodega de destino es obligatoria.');
    if (!data.items || data.items.length === 0) {
      throw new Error('La orden de compra debe tener al menos un item.');
    }

    const proveedor = await this.terceroRepo.getById(schemaName, data.proveedorId);
    const ordenId = `oc_${uuidv4().substring(0, 8)}`;
    const numero = await this.comprasRepo.getNextNumeroOrden(schemaName);

    let subtotal = 0;
    const items: OrdenCompraItem[] = data.items.map((it) => {
      const itemSubtotal = it.cantidadSolicitada * it.precioUnitario;
      subtotal += itemSubtotal;
      return new OrdenCompraItem({
        id: `oci_${uuidv4().substring(0, 8)}`,
        ordenId,
        productoId: it.productoId,
        varianteId: it.varianteId,
        productoNombre: it.productoNombre,
        cantidadSolicitada: it.cantidadSolicitada,
        cantidadRecibida: 0,
        precioUnitario: it.precioUnitario,
        subtotal: itemSubtotal,
      });
    });

    // Impuestos estimados 19% si aplica
    const impuestos = Math.round(subtotal * 0.19);
    const total = subtotal + impuestos;

    const orden = new OrdenCompra({
      id: ordenId,
      proveedorId: data.proveedorId,
      proveedorNombre: proveedor ? proveedor.razonSocial : undefined,
      bodegaDestinoId: data.bodegaDestinoId,
      numero,
      estado: 'ENVIADA',
      fechaEmision: new Date(),
      fechaEntregaEstimada: data.fechaEntregaEstimada,
      subtotal,
      impuestos,
      total,
      notas: data.notas,
      creadoPor: data.creadoPor,
      items,
    });

    return this.comprasRepo.createOrden(schemaName, orden);
  }
}

