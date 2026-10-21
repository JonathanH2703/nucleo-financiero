import { IFacturacionRepository } from '../../../domain/repositories/pos.repository.interface.js';
import { FacturaFiscal } from '../../../domain/entities/facturacion.entity.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Use Case: Anular una factura fiscal y generar nota de crédito asociada.
 * Valida que la factura exista, no esté ya anulada, y genera NC con CUFE propio.
 */
export class AnularFacturaUseCase {
  constructor(private readonly facturacionRepo: IFacturacionRepository) {}

  public async execute(
    schemaName: string,
    facturaId: string,
    motivo?: string
  ): Promise<{ notaCredito: FacturaFiscal; mensaje: string }> {
    const factura = await this.facturacionRepo.getFacturaById(schemaName, facturaId);
    if (!factura) {
      throw new Error(`Factura no encontrada con ID: ${facturaId}`);
    }

    if (factura.estadoDian === 'ANULADA') {
      throw new Error(`La factura ${factura.numeroCompleto} ya fue anulada anteriormente`);
    }

    if (factura.tipoDocumento === 'NOTA_CREDITO_DIAN') {
      throw new Error('No se puede anular una nota de crédito');
    }

    // Marcar factura original como ANULADA
    await this.facturacionRepo.updateFacturaEstado(schemaName, facturaId, 'ANULADA');

    // Generar Nota de Crédito Electrónica
    const prefijo = 'NC-2026';
    const consecutivo = await this.facturacionRepo.getNextConsecutivo(schemaName, prefijo);
    const cufe = `CUFE-NC-2026-${uuidv4().replace(/-/g, '').substring(0, 32).toUpperCase()}`;

    const notaCredito = new FacturaFiscal({
      id: uuidv4(),
      prefijo,
      consecutivo,
      tipoDocumento: 'NOTA_CREDITO_DIAN',
      fechaEmision: new Date(),
      fechaVencimiento: new Date(),
      clienteNombre: factura.clienteNombre,
      clienteNit: factura.clienteNit,
      baseGravable: -factura.baseGravable,
      totalIva: -factura.totalIva,
      totalImpoconsumo: -factura.totalImpoconsumo,
      propina: 0,
      totalPagar: -factura.totalPagar,
      estadoDian: 'ACEPTADA',
      cufe,
      notas: motivo || `Anulación de factura ${factura.numeroCompleto}`,
      facturaReferenciaId: facturaId,
    });

    await this.facturacionRepo.createFactura(schemaName, notaCredito);

    return {
      notaCredito,
      mensaje: `Factura ${factura.numeroCompleto} anulada. Nota crédito ${notaCredito.numeroCompleto} generada exitosamente.`,
    };
  }
}
