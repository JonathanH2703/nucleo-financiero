import { Request, Response, NextFunction } from 'express';
import { PostgresPosRepository } from '../../../infrastructure/repositories/postgres-pos.repository.js';
import { ListFacturasUseCase } from '../../../application/use-cases/facturacion/list-facturas.use-case.js';
import { AnularFacturaUseCase } from '../../../application/use-cases/facturacion/anular-factura.use-case.js';
import { RegistrarPagoUseCase } from '../../../application/use-cases/facturacion/registrar-pago.use-case.js';
import { GetResumenFinancieroUseCase } from '../../../application/use-cases/facturacion/get-resumen-financiero.use-case.js';
import { EmitirFacturaDirectaUseCase } from '../../../application/use-cases/facturacion/emitir-factura-directa.use-case.js';

const posRepo = new PostgresPosRepository();
const listFacturasUseCase = new ListFacturasUseCase(posRepo);
const anularFacturaUseCase = new AnularFacturaUseCase(posRepo);
const registrarPagoUseCase = new RegistrarPagoUseCase(posRepo);
const getResumenFinancieroUseCase = new GetResumenFinancieroUseCase(posRepo);
const emitirFacturaDirectaUseCase = new EmitirFacturaDirectaUseCase(posRepo);

export class FacturacionController {
  /**
   * POST /facturacion/documentos
   * Emisión directa de factura fiscal para MiPymes sin flujo de comanda POS.
   */
  public static async emitirFacturaDirecta(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const {
        clienteNombre,
        clienteNit,
        tipoDocumento,
        baseGravable,
        porcentajeIva,
        metodoPago,
        estadoDian,
        diasVencimiento,
        notas,
      } = req.body;

      const result = await emitirFacturaDirectaUseCase.execute(tenant.schemaName, {
        clienteNombre,
        clienteNit,
        tipoDocumento,
        baseGravable: Number(baseGravable),
        porcentajeIva: porcentajeIva !== undefined ? Number(porcentajeIva) : 19,
        metodoPago,
        estadoDian,
        diasVencimiento: diasVencimiento ? Number(diasVencimiento) : 30,
        notas,
      });

      res.status(201).json({
        success: true,
        message: result.mensaje,
        data: FacturacionController.mapFacturaToResponse(result.factura),
      });
    } catch (err) {
      next(err);
    }
  }
  /**
   * GET /facturacion/documentos
   * Listado de facturas con filtros y paginación server-side.
   */
  public static async listFacturas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const { limit, estado, search, fechaDesde, fechaHasta, tipoDocumento, page } = req.query;

      // Si vienen filtros avanzados, usar listFacturasWithFilters (paginado)
      if (estado || search || fechaDesde || fechaHasta || tipoDocumento || page) {
        const result = await posRepo.listFacturasWithFilters(tenant.schemaName, {
          estado: estado as string,
          search: search as string,
          fechaDesde: fechaDesde as string,
          fechaHasta: fechaHasta as string,
          tipoDocumento: tipoDocumento as string,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 25,
        });

        res.status(200).json({
          success: true,
          tenant: tenant.slug,
          count: result.facturas.length,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          data: result.facturas.map((f) => FacturacionController.mapFacturaToResponse(f)),
        });
        return;
      }

      // Fallback: listado simple (compatibilidad)
      const facturas = await listFacturasUseCase.execute(
        tenant.schemaName,
        limit ? Number(limit) : 50
      );

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        count: facturas.length,
        data: facturas.map((f) => FacturacionController.mapFacturaToResponse(f)),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /facturacion/documentos/:id
   * Detalle de factura individual con historial de pagos.
   */
  public static async getFacturaById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const id = String(req.params.id);

      const factura = await posRepo.getFacturaById(tenant.schemaName, id);
      if (!factura) {
        res.status(404).json({ success: false, message: 'Factura no encontrada' });
        return;
      }

      // Obtener pagos asociados en la misma request (evita N+1 en frontend)
      const pagos = await posRepo.listPagosFactura(tenant.schemaName, id);
      const totalPagado = pagos.reduce((sum: number, p: any) => sum + Number(p.monto), 0);

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        data: {
          ...FacturacionController.mapFacturaToResponse(factura),
          pagos: pagos.map((p: any) => ({
            id: p.id,
            monto: Number(p.monto),
            metodoPago: p.metodo_pago,
            referencia: p.referencia,
            notas: p.notas,
            fecha: p.created_at,
          })),
          totalPagado,
          saldoPendiente: Math.max(0, factura.totalPagar - totalPagado),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /facturacion/documentos/:id/anular
   * Anula una factura y genera nota de crédito electrónica.
   */
  public static async anularFactura(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const facturaId = String(req.params.id);
      const { motivo } = req.body;

      const result = await anularFacturaUseCase.execute(tenant.schemaName, facturaId, motivo);

      res.status(200).json({
        success: true,
        message: result.mensaje,
        notaCredito: FacturacionController.mapFacturaToResponse(result.notaCredito),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /facturacion/documentos/:id/pago
   * Registra un pago parcial o total contra una factura.
   */
  public static async registrarPago(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const facturaId = String(req.params.id);
      const { monto, metodoPago, referencia, notas } = req.body;

      if (!monto || !metodoPago) {
        res.status(400).json({ success: false, message: 'Monto y método de pago son requeridos' });
        return;
      }

      const result = await registrarPagoUseCase.execute(tenant.schemaName, {
        facturaId,
        monto: Number(monto),
        metodoPago,
        referencia,
        notas,
      });

      res.status(200).json({
        success: true,
        message: result.mensaje,
        nuevoEstado: result.nuevoEstado,
        totalPagado: result.totalPagado,
        saldoPendiente: result.saldoPendiente,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /facturacion/resumen
   * Resumen financiero consolidado para dashboards (una sola query aggregada).
   */
  public static async getResumen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = (req as any).tenant;
      const resumen = await getResumenFinancieroUseCase.execute(tenant.schemaName);

      res.status(200).json({
        success: true,
        tenant: tenant.slug,
        data: resumen,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Helper: Mapea entidad a response DTO (DRY, evita duplicación).
   */
  private static mapFacturaToResponse(f: any) {
    return {
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
      metodoPago: f.metodoPago,
      notas: f.notas,
      facturaReferenciaId: f.facturaReferenciaId,
      esNotaCredito: f.esNotaCredito || f.tipoDocumento === 'NOTA_CREDITO_DIAN',
    };
  }
}
