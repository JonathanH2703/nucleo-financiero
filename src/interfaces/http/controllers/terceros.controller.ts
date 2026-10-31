import { Request, Response, NextFunction } from 'express';
import { PostgresTerceroRepository } from '../../../infrastructure/repositories/postgres-tercero.repository.js';
import { SaveTerceroUseCase } from '../../../application/use-cases/terceros/save-tercero.use-case.js';
import { ListTercerosUseCase } from '../../../application/use-cases/terceros/list-terceros.use-case.js';

const terceroRepo = new PostgresTerceroRepository();
const saveTerceroUseCase = new SaveTerceroUseCase(terceroRepo);
const listTercerosUseCase = new ListTercerosUseCase(terceroRepo);

export class TercerosController {
  public static async listTerceros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { tipo, search, activo, page, limit } = req.query;

      const result = await listTercerosUseCase.execute(tenant.schemaName, {
        tipo: tipo as string,
        search: search as string,
        activo: activo !== undefined ? activo === 'true' : true,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });

      res.status(200).json({
        success: true,
        count: result.terceros.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        data: result.terceros,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getTerceroById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const tercero = await terceroRepo.getById(tenant.schemaName, id);
      if (!tercero) {
        res.status(404).json({ success: false, message: 'Tercero / Empresa no encontrada' });
        return;
      }
      res.status(200).json({ success: true, data: tercero });
    } catch (err) {
      next(err);
    }
  }

  public static async createTercero(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const tercero = await saveTerceroUseCase.execute(tenant.schemaName, req.body);

      res.status(201).json({
        success: true,
        message: 'Tercero / Empresa guardada exitosamente en la base de datos',
        data: tercero,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateTercero(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const actualizado = await terceroRepo.update(tenant.schemaName, id, req.body);

      res.status(200).json({
        success: true,
        message: 'Tercero / Empresa actualizada exitosamente',
        data: actualizado,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteTercero(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      await terceroRepo.delete(tenant.schemaName, id);

      res.status(200).json({
        success: true,
        message: 'Tercero / Empresa desactivada exitosamente',
      });
    } catch (err) {
      next(err);
    }
  }
}
