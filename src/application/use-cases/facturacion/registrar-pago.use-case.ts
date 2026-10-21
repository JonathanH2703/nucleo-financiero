import { IFacturacionRepository } from '../../../domain/repositories/pos.repository.interface.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Use Case: Registrar un pago parcial o total contra una factura.
 * Actualiza automáticamente el estado de la factura según el monto acumulado de pagos.
 */
export class RegistrarPagoUseCase {
  constructor(private readonly facturacionRepo: IFacturacionRepository) {}

  public async execute(
    schemaName: string,
    dto: {
      facturaId: string;
      monto: number;
      metodoPago: string;
      referencia?: string;
      notas?: string;
    }
  ): Promise<{ mensaje: string; nuevoEstado: string; totalPagado: number; saldoPendiente: number }> {
    const factura = await this.facturacionRepo.getFacturaById(schemaName, dto.facturaId);
    if (!factura) {
      throw new Error(`Factura no encontrada con ID: ${dto.facturaId}`);
    }

    if (factura.estadoDian === 'ANULADA') {
      throw new Error('No se puede registrar pagos a una factura anulada');
    }

    if (dto.monto <= 0) {
      throw new Error('El monto del pago debe ser mayor a cero');
    }

    // Registrar el pago
    await this.facturacionRepo.createPagoFactura(schemaName, {
      id: uuidv4(),
      facturaId: dto.facturaId,
      monto: dto.monto,
      metodoPago: dto.metodoPago,
      referencia: dto.referencia,
      notas: dto.notas,
    });

    // Calcular total pagado
    const pagos = await this.facturacionRepo.listPagosFactura(schemaName, dto.facturaId);
    const totalPagado = pagos.reduce((sum: number, p: any) => sum + Number(p.monto), 0);
    const saldoPendiente = Math.max(0, factura.totalPagar - totalPagado);

    // Actualizar estado automáticamente
    let nuevoEstado: string;
    if (saldoPendiente <= 0) {
      nuevoEstado = 'ACEPTADA'; // Pagada completamente
      await this.facturacionRepo.updateFacturaEstado(schemaName, dto.facturaId, 'ACEPTADA');
    } else {
      nuevoEstado = 'PAGO_PARCIAL';
      await this.facturacionRepo.updateFacturaEstado(schemaName, dto.facturaId, 'PAGO_PARCIAL');
    }

    return {
      mensaje: saldoPendiente <= 0
        ? `Pago total registrado. Factura ${factura.numeroCompleto} liquidada.`
        : `Pago parcial de $${dto.monto.toLocaleString('es-CO')} registrado. Saldo pendiente: $${saldoPendiente.toLocaleString('es-CO')}.`,
      nuevoEstado,
      totalPagado,
      saldoPendiente,
    };
  }
}
