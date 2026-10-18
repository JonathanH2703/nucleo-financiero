import { Request, Response, NextFunction } from 'express';
import { PostgresPosRepository } from '../../../infrastructure/repositories/postgres-pos.repository.js';
import { GetCatalogoUseCase } from '../../../application/use-cases/pos/get-catalogo.use-case.js';
import { GetOperacionUseCase } from '../../../application/use-cases/pos/get-operacion.use-case.js';
import { CreateComandaUseCase } from '../../../application/use-cases/pos/create-comanda.use-case.js';
import { CobrarComandaUseCase } from '../../../application/use-cases/pos/cobrar-comanda.use-case.js';
import { GetKdsUseCase } from '../../../application/use-cases/pos/get-kds.use-case.js';

const posRepo = new PostgresPosRepository();
const getCatalogoUseCase = new GetCatalogoUseCase(posRepo);
const getOperacionUseCase = new GetOperacionUseCase(posRepo);
const createComandaUseCase = new CreateComandaUseCase(posRepo, posRepo, posRepo);
const cobrarComandaUseCase = new CobrarComandaUseCase(posRepo, posRepo, posRepo);
const getKdsUseCase = new GetKdsUseCase(posRepo);

export class PosController {
  public static async getCatalogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { categoriaId, search, barcode } = req.query;

      const catalogo = await getCatalogoUseCase.execute(tenant.schemaName, {
        categoriaId: categoriaId as string,
        search: search as string,
        barcode: barcode as string,
      });

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        data: catalogo,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getOperacion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { areaId } = req.query;

      const operacion = await getOperacionUseCase.execute(tenant.schemaName, areaId as string);

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        data: operacion,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createComanda(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const comanda = await createComandaUseCase.execute(tenant.schemaName, req.body);

      res.status(201).json({
        success: true,
        message: 'Comanda registrada exitosamente',
        data: {
          id: comanda.id,
          numeroComanda: comanda.numeroComanda,
          modoAtencion: comanda.modoAtencion,
          puntoAtencionNombre: comanda.puntoAtencionNombre,
          cliente: comanda.clienteNombre,
          subtotal: comanda.subtotal,
          impuestos: comanda.totalImpuestos,
          propinaSugerida: comanda.propinaSugerida,
          total: comanda.total,
          itemsCount: comanda.items.length,
          requiereKds: comanda.itemsRequierenKds.length > 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listComandasActivas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const comandas = await posRepo.listComandasActivas(tenant.schemaName);

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        count: comandas.length,
        data: comandas.map((c) => ({
          id: c.id,
          numeroComanda: c.numeroComanda,
          modoAtencion: c.modoAtencion,
          puntoAtencionId: c.puntoAtencionId,
          puntoAtencionNombre: c.puntoAtencionNombre,
          estado: c.estado,
          cliente: c.clienteNombre,
          total: c.total,
          createdAt: c.createdAt,
          items: c.items.map((i) => ({
            id: i.id,
            nombre: i.nombreProducto,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            subtotal: i.subtotal,
            estadoPreparacion: i.estadoPreparacion,
          })),
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async cobrarComanda(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const comandaId = String(req.params.comandaId);
      const result = await cobrarComandaUseCase.execute(tenant.schemaName, {
        comandaId,
        ...req.body,
      });

      res.status(200).json({
        success: true,
        message: result.mensaje,
        factura: {
          id: result.factura.id,
          numeroCompleto: result.factura.numeroCompleto,
          tipoDocumento: result.factura.tipoDocumento,
          clienteNombre: result.factura.clienteNombre,
          clienteNit: result.factura.clienteNit,
          baseGravable: result.factura.baseGravable,
          totalIva: result.factura.totalIva,
          totalImpoconsumo: result.factura.totalImpoconsumo,
          propina: result.factura.propina,
          totalPagar: result.factura.totalPagar,
          estadoDian: result.factura.estadoDian,
          cufe: result.factura.cufe,
          qrCode: result.factura.qrCode,
          fechaEmision: result.factura.fechaEmision,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getKdsQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const queue = await getKdsUseCase.getQueue(tenant.schemaName);

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        count: queue.length,
        data: queue.map((q) => ({
          itemId: q.item.id,
          comandaId: q.item.comandaId,
          comandaNumero: q.comandaNumero,
          puntoAtencion: q.puntoAtencion || 'Mostrador / Para Llevar',
          producto: q.item.nombreProducto,
          cantidad: q.item.cantidad,
          notasCocina: q.item.notasCocina,
          estado: q.item.estadoPreparacion,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateKdsItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const itemId = String(req.params.itemId);
      const { estado } = req.body; // 'EN_COCINA' | 'LISTO'

      await getKdsUseCase.updateItemStatus(tenant.schemaName, itemId, estado);

      res.status(200).json({
        success: true,
        message: `Estado de preparación del item actualizado a ${estado}`,
      });
    } catch (err) {
      next(err);
    }
  }
}
