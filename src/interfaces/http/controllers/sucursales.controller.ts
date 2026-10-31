import { Request, Response, NextFunction } from 'express';
import { PostgresSucursalRepository } from '../../../infrastructure/repositories/postgres-sucursal.repository.js';
import { PostgresBodegaRepository } from '../../../infrastructure/repositories/postgres-bodega.repository.js';
import { Sucursal } from '../../../domain/entities/sucursal.entity.js';
import { Bodega } from '../../../domain/entities/bodega.entity.js';
import { v4 as uuidv4 } from 'uuid';

const sucursalRepo = new PostgresSucursalRepository();
const bodegaRepo = new PostgresBodegaRepository();

export class SucursalesController {
  // ================= SUCURSALES =================
  public static async listSucursales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const sucursales = await sucursalRepo.listSucursales(tenant.schemaName);
      res.status(200).json({ success: true, count: sucursales.length, data: sucursales });
    } catch (err) {
      next(err);
    }
  }

  public static async createSucursal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { nombre, codigo, direccion, ciudad, departamento, telefono, responsableId, pinAcceso } = req.body;

      if (!nombre || !codigo) {
        res.status(400).json({ success: false, message: 'El nombre y código de sucursal son obligatorios.' });
        return;
      }

      const sucursal = new Sucursal({
        id: `suc_${uuidv4().substring(0, 8)}`,
        nombre,
        codigo,
        direccion,
        ciudad,
        departamento,
        telefono,
        responsableId,
        pinAcceso: pinAcceso || Math.floor(1000 + Math.random() * 9000).toString(),
      });

      const creada = await sucursalRepo.createSucursal(tenant.schemaName, sucursal);
      res.status(201).json({ success: true, message: 'Sucursal creada exitosamente', data: creada });
    } catch (err) {
      next(err);
    }
  }

  public static async updateSucursal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const actualizada = await sucursalRepo.updateSucursal(tenant.schemaName, id, req.body);
      res.status(200).json({ success: true, message: 'Sucursal actualizada exitosamente', data: actualizada });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteSucursal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      await sucursalRepo.deleteSucursal(tenant.schemaName, id);
      res.status(200).json({ success: true, message: 'Sucursal desactivada exitosamente' });
    } catch (err) {
      next(err);
    }
  }

  // ================= BODEGAS =================
  public static async listBodegas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const sucursalId = req.query.sucursalId as string | undefined;
      const bodegas = await bodegaRepo.listBodegas(tenant.schemaName, sucursalId);
      res.status(200).json({ success: true, count: bodegas.length, data: bodegas });
    } catch (err) {
      next(err);
    }
  }

  public static async createBodega(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { sucursalId, nombre, codigo, tipo } = req.body;

      if (!sucursalId || !nombre || !codigo) {
        res.status(400).json({ success: false, message: 'La sucursal, nombre y código de bodega son obligatorios.' });
        return;
      }

      const bodega = new Bodega({
        id: `bod_${uuidv4().substring(0, 8)}`,
        sucursalId,
        nombre,
        codigo,
        tipo,
      });

      const creada = await bodegaRepo.createBodega(tenant.schemaName, bodega);
      res.status(201).json({ success: true, message: 'Bodega creada exitosamente', data: creada });
    } catch (err) {
      next(err);
    }
  }

  public static async updateBodega(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      const actualizada = await bodegaRepo.updateBodega(tenant.schemaName, id, req.body);
      res.status(200).json({ success: true, message: 'Bodega actualizada exitosamente', data: actualizada });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteBodega(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);
      await bodegaRepo.deleteBodega(tenant.schemaName, id);
      res.status(200).json({ success: true, message: 'Bodega desactivada exitosamente' });
    } catch (err) {
      next(err);
    }
  }
}

