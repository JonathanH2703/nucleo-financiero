import { Request, Response, NextFunction } from 'express';
import { PostgresComprasRepository } from '../../../infrastructure/repositories/postgres-compras.repository.js';
import { PostgresInventarioRepository } from '../../../infrastructure/repositories/postgres-inventario.repository.js';
import { PostgresTerceroRepository } from '../../../infrastructure/repositories/postgres-tercero.repository.js';
import { CreateOrdenCompraUseCase } from '../../../application/use-cases/compras/create-orden-compra.use-case.js';
import { RecibirCompraUseCase } from '../../../application/use-cases/compras/recibir-compra.use-case.js';

const comprasRepo = new PostgresComprasRepository();
const inventarioRepo = new PostgresInventarioRepository();
const terceroRepo = new PostgresTerceroRepository();

const createOrdenCompraUseCase = new CreateOrdenCompraUseCase(comprasRepo, terceroRepo);
const recibirCompraUseCase = new RecibirCompraUseCase(comprasRepo, inventarioRepo, terceroRepo);

export class ComprasController {
  // ================= ÓRDENES DE COMPRA =================
  public static async listOrdenes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { estado, proveedorId, search, page, limit } = req.query;

      const result = await comprasRepo.listOrdenes(tenant.schemaName, {
        estado: estado as string,
        proveedorId: proveedorId as string,
        search: search as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
      });

      res.status(200).json({
        success: true,
        count: result.ordenes.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        data: result.ordenes,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getOrdenById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const orden = await comprasRepo.getOrdenById(tenant.schemaName, id);
      if (!orden) {
        res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });
        return;
      }
      res.status(200).json({ success: true, data: orden });
    } catch (err) {
      next(err);
    }
  }

  public static async createOrden(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const orden = await createOrdenCompraUseCase.execute(tenant.schemaName, req.body);
      res.status(201).json({
        success: true,
        message: `Orden de compra ${orden.numero} emitida exitosamente`,
        data: orden,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateOrden(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const orden = await comprasRepo.updateOrden(tenant.schemaName, id, req.body);
      res.status(200).json({ success: true, message: 'Orden de compra actualizada exitosamente', data: orden });
    } catch (err) {
      next(err);
    }
  }

  // ================= RECEPCIONES =================
  public static async registrarRecepcion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const result = await recibirCompraUseCase.execute(tenant.schemaName, req.body);
      res.status(201).json({
        success: true,
        message: `Mercancía ingresada a bodega exitosamente (Recepción ${result.recepcion.numero}). Cuenta por pagar generada.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getRecepcionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const rec = await comprasRepo.getRecepcionById(tenant.schemaName, id);
      if (!rec) {
        res.status(404).json({ success: false, message: 'Recepción no encontrada' });
        return;
      }
      res.status(200).json({ success: true, data: rec });
    } catch (err) {
      next(err);
    }
  }

  public static async listRecepcionesByOrden(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const ordenId = String(req.params.ordenId);
      const recepciones = await comprasRepo.listRecepcionesByOrden(tenant.schemaName, ordenId);
      res.status(200).json({ success: true, count: recepciones.length, data: recepciones });
    } catch (err) {
      next(err);
    }
  }

  // ================= CUENTAS POR PAGAR =================
  public static async listCuentasPorPagar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { estado, proveedorId, vencidas, page, limit } = req.query;

      const result = await comprasRepo.listCuentasPorPagar(tenant.schemaName, {
        estado: estado as string,
        proveedorId: proveedorId as string,
        vencidas: vencidas === 'true',
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
      });

      res.status(200).json({
        success: true,
        count: result.cuentas.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        data: result.cuentas,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async registrarPago(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const { monto, referencia } = req.body;

      if (!monto || Number(monto) <= 0) {
        res.status(400).json({ success: false, message: 'El monto a pagar debe ser mayor a cero' });
        return;
      }

      await comprasRepo.registrarPagoCuenta(tenant.schemaName, id, Number(monto), referencia);
      const actualizada = await comprasRepo.getCuentaById(tenant.schemaName, id);

      res.status(200).json({
        success: true,
        message: 'Abono / Pago registrado exitosamente contra la obligación del proveedor',
        data: actualizada,
      });
    } catch (err) {
      next(err);
    }
  }
}

