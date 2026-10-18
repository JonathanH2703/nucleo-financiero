import { Request, Response, NextFunction } from 'express';
import { PostgresPosRepository } from '../../../infrastructure/repositories/postgres-pos.repository.js';
import { ListFacturasUseCase } from '../../../application/use-cases/facturacion/list-facturas.use-case.js';

const posRepo = new PostgresPosRepository();
const listFacturasUseCase = new ListFacturasUseCase(posRepo);

export class FacturacionController {
  public static async listFacturas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { limit } = req.query;

      const facturas = await listFacturasUseCase.execute(
        tenant.schemaName,
        limit ? Number(limit) : 50
      );

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        count: facturas.length,
        data: facturas.map((f) => ({
          id: f.id,
          numeroCompleto: f.numeroCompleto,
          prefijo: f.prefijo,
          consecutivo: f.consecutivo,
          tipoDocumento: f.tipoDocumento,
          fechaEmision: f.fechaEmision,
          fechaVencimiento: f.fechaVencimiento,
          clienteNombre: f.clienteNombre,
          clienteNit: f.clienteNit,
          baseGravable: f.baseGravable,
          totalIva: f.totalIva,
          totalImpoconsumo: f.totalImpoconsumo,
          propina: f.propina,
          totalPagar: f.totalPagar,
          estadoDian: f.estadoDian,
          cufe: f.cufe,
          qrCode: f.qrCode,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getFacturaById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);

      const factura = await posRepo.getFacturaById(tenant.schemaName, id);
      if (!factura) {
        res.status(404).json({ success: false, message: 'Factura no encontrada' });
        return;
      }

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        data: factura,
      });
    } catch (err) {
      next(err);
    }
  }
}
