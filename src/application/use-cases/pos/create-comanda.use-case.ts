import { v4 as uuidv4 } from 'uuid';
import { IPosRepository, ICatalogoRepository, IOperacionRepository } from '../../../domain/repositories/pos.repository.interface.js';
import { Comanda, ItemComanda, ModoAtencion } from '../../../domain/entities/pos.entity.js';

export interface CreateComandaDTO {
  modoAtencion: ModoAtencion; // 'MOSTRADOR_ESCANER' | 'MESA_SERVICIO' | 'VITRINA_RAPIDO'
  puntoAtencionId?: string;
  clienteNombre?: string;
  clienteNit?: string;
  descuento?: number;
  incluyePropina?: boolean;
  porcentajePropina?: number;
  notas?: string;
  items: {
    productoId: string;
    cantidad: number;
    notasCocina?: string;
  }[];
}

export class CreateComandaUseCase {
  constructor(
    private readonly posRepo: IPosRepository,
    private readonly catalogoRepo: ICatalogoRepository,
    private readonly operacionRepo: IOperacionRepository
  ) {}

  public async execute(schemaName: string, dto: CreateComandaDTO): Promise<Comanda> {
    if (!dto.items || dto.items.length === 0) {
      throw new Error('La comanda debe contener al menos un producto');
    }

    let puntoAtencionNombre: string | undefined;
    if (dto.puntoAtencionId) {
      const punto = await this.operacionRepo.getPuntoAtencionById(schemaName, dto.puntoAtencionId);
      if (punto) {
        puntoAtencionNombre = punto.nombre;
      }
    }

    const comandaId = uuidv4();
    const numeroComanda = `CMD-${Date.now().toString().slice(-6)}`;

    const items: ItemComanda[] = [];
    for (const it of dto.items) {
      const prod = await this.catalogoRepo.getProductoById(schemaName, it.productoId);
      if (!prod) {
        throw new Error(`Producto no encontrado con ID: ${it.productoId}`);
      }

      items.push(
        new ItemComanda({
          id: uuidv4(),
          comandaId,
          productoId: prod.id,
          nombreProducto: prod.nombre,
          cantidad: it.cantidad,
          precioUnitario: prod.precioBase,
          tipoImpuesto: prod.tipoImpuesto,
          notasCocina: it.notasCocina,
          requiereKds: prod.requiereKds,
          estadoPreparacion: prod.requiereKds ? 'PENDIENTE' : 'LISTO',
        })
      );
    }

    const comanda = new Comanda({
      id: comandaId,
      numeroComanda,
      modoAtencion: dto.modoAtencion,
      puntoAtencionId: dto.puntoAtencionId,
      puntoAtencionNombre,
      clienteNombre: dto.clienteNombre || 'Consumidor Final',
      clienteNit: dto.clienteNit || '222222222222',
      descuento: dto.descuento || 0,
      incluyePropina: dto.incluyePropina ?? (dto.modoAtencion === 'MESA_SERVICIO'),
      porcentajePropina: dto.porcentajePropina ?? 10,
      notas: dto.notas,
      items,
    });

    return await this.posRepo.createComanda(schemaName, comanda);
  }
}
