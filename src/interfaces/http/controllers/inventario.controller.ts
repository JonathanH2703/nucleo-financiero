import { Request, Response, NextFunction } from 'express';
import { PostgresInventarioRepository } from '../../../infrastructure/repositories/postgres-inventario.repository.js';
import { RegistrarMovimientoUseCase } from '../../../application/use-cases/inventario/registrar-movimiento.use-case.js';
import { GetKardexUseCase } from '../../../application/use-cases/inventario/get-kardex.use-case.js';
import { CrearAjusteUseCase } from '../../../application/use-cases/inventario/crear-ajuste.use-case.js';
import { ConfirmarAjusteUseCase } from '../../../application/use-cases/inventario/confirmar-ajuste.use-case.js';

const inventarioRepo = new PostgresInventarioRepository();
const registrarMovimientoUseCase = new RegistrarMovimientoUseCase(inventarioRepo);
const getKardexUseCase = new GetKardexUseCase(inventarioRepo);
const crearAjusteUseCase = new CrearAjusteUseCase(inventarioRepo);
const confirmarAjusteUseCase = new ConfirmarAjusteUseCase(inventarioRepo);

export class InventarioController {
  // ================= KARDEX =================
  public static async getKardex(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { productoId, varianteId, bodegaId, tipo, fechaDesde, fechaHasta, page, limit } = req.query;

      const result = await getKardexUseCase.execute(tenant.schemaName, {
        productoId: productoId as string,
        varianteId: varianteId as string,
        bodegaId: bodegaId as string,
        tipo: tipo as string,
        fechaDesde: fechaDesde as string,
        fechaHasta: fechaHasta as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });

      res.status(200).json({
        success: true,
        count: result.movimientos.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        data: result.movimientos,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async registrarMovimiento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const mov = await registrarMovimientoUseCase.execute(tenant.schemaName, req.body);
      res.status(201).json({
        success: true,
        message: 'Movimiento de inventario asentado en Kardex exitosamente',
        data: mov,
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= STOCK =================
  public static async getStockProducto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const productoId = String(req.params.productoId);
      const bodegaId = req.query.bodegaId as string | undefined;

      const stockBodegas = await inventarioRepo.getStockProducto(tenant.schemaName, productoId, bodegaId);
      const stockConsolidado = await inventarioRepo.getStockConsolidado(tenant.schemaName, productoId);

      res.status(200).json({
        success: true,
        productoId,
        stockConsolidado,
        bodegas: stockBodegas,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getStockBajo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const bodegaId = req.query.bodegaId as string | undefined;
      const alertas = await inventarioRepo.getProductosStockBajo(tenant.schemaName, bodegaId);

      res.status(200).json({
        success: true,
        count: alertas.length,
        data: alertas,
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= AJUSTES =================
  public static async crearAjuste(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const ajuste = await crearAjusteUseCase.execute(tenant.schemaName, req.body);
      res.status(201).json({
        success: true,
        message: `Ajuste de inventario ${ajuste.numero} creado en estado PENDIENTE`,
        data: ajuste,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listAjustes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { bodegaId, estado, page, limit } = req.query;

      const result = await inventarioRepo.listAjustes(tenant.schemaName, {
        bodegaId: bodegaId as string,
        estado: estado as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
      });

      res.status(200).json({
        success: true,
        count: result.ajustes.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        data: result.ajustes,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAjusteById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const ajuste = await inventarioRepo.getAjusteById(tenant.schemaName, id);
      if (!ajuste) {
        res.status(404).json({ success: false, message: 'Ajuste no encontrado' });
        return;
      }
      res.status(200).json({ success: true, data: ajuste });
    } catch (err) {
      next(err);
    }
  }

  public static async confirmarAjuste(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const aprobadoPor = req.body.aprobadoPor || 'administrador';

      await confirmarAjusteUseCase.execute(tenant.schemaName, id, aprobadoPor);
      res.status(200).json({
        success: true,
        message: 'Ajuste confirmado y aplicado al stock real con registros en Kardex',
      });
    } catch (err) {
      next(err);
    }
  }

  public static async revertirAjuste(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      await inventarioRepo.revertirAjuste(tenant.schemaName, id);
      res.status(200).json({
        success: true,
        message: 'Ajuste revertido y saldos restaurados en Kardex',
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= LOTES =================
  public static async listLotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const productoId = String(req.query.productoId);
      const bodegaId = req.query.bodegaId as string | undefined;

      const lotes = await inventarioRepo.getLotesByProducto(tenant.schemaName, productoId, bodegaId);
      res.status(200).json({ success: true, count: lotes.length, data: lotes });
    } catch (err) {
      next(err);
    }
  }

  public static async getLotesPorVencer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const dias = Number(req.query.dias || 30);
      const lotes = await inventarioRepo.getLotesProximosVencer(tenant.schemaName, dias);
      res.status(200).json({ success: true, count: lotes.length, data: lotes });
    } catch (err) {
      next(err);
    }
  }
}

