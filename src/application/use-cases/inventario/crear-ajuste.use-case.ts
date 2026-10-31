import { v4 as uuidv4 } from 'uuid';
import { IInventarioRepository } from '../../../domain/repositories/inventario.repository.interface.js';
import { AjusteInventario, AjusteItem, AjusteInventarioProps } from '../../../domain/entities/inventario.entity.js';

export class CrearAjusteUseCase {
  constructor(private readonly inventarioRepo: IInventarioRepository) { }

  public async execute(
    schemaName: string,
    data: {
      bodegaId: string;
      tipo?: AjusteInventarioProps['tipo'];
      observaciones?: string;
      creadoPor?: string;
      items: {
        productoId: string;
        varianteId?: string;
        cantidadFisica: number;
        costoUnitario?: number;
      }[];
    }
  ): Promise<AjusteInventario> {
    if (!data.bodegaId) throw new Error('La bodega es obligatoria.');
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe incluir al menos un item para ajustar.');
    }

    const ajusteId = `ajuste_${uuidv4().substring(0, 8)}`;
    const numero = `AJ-${Date.now().toString().slice(-6)}`;

    const items: AjusteItem[] = [];

    for (const item of data.items) {
      const stockRes = await this.inventarioRepo.getStockProducto(schemaName, item.productoId, data.bodegaId);
      const stockSistema = stockRes.length > 0 ? stockRes[0].cantidad : 0;
      const diferencia = item.cantidadFisica - stockSistema;

      items.push(
        new AjusteItem({
          id: `item_${uuidv4().substring(0, 8)}`,
          ajusteId,
          productoId: item.productoId,
          varianteId: item.varianteId,
          cantidadSistema: stockSistema,
          cantidadFisica: item.cantidadFisica,
          diferencia,
          costoUnitario: item.costoUnitario || (stockRes.length > 0 ? stockRes[0].costoPromedio : 0),
        })
      );
    }

    const ajuste = new AjusteInventario({
      id: ajusteId,
      bodegaId: data.bodegaId,
      numero,
      tipo: data.tipo ?? 'CONTEO_FISICO',
      observaciones: data.observaciones,
      estado: 'PENDIENTE',
      creadoPor: data.creadoPor,
      items,
    });

    return this.inventarioRepo.crearAjuste(schemaName, ajuste);
  }
}

