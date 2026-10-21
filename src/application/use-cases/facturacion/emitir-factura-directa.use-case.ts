import { v4 as uuidv4 } from 'uuid';
import { IFacturacionRepository } from '../../../domain/repositories/pos.repository.interface.js';
import { FacturaFiscal, TipoDocumentoFiscal, EstadoDian, MetodoPago } from '../../../domain/entities/facturacion.entity.js';

export interface EmitirFacturaDirectaDTO {
  clienteNombre: string;
  clienteNit: string;
  tipoDocumento?: TipoDocumentoFiscal;
  baseGravable: number;
  porcentajeIva?: number;
  metodoPago?: MetodoPago;
  estadoDian?: EstadoDian;
  diasVencimiento?: number;
  notas?: string;
}

/**
 * Use Case: Emisión directa de factura electrónica DIAN para MiPymes (sin mesa POS).
 * Genera consecutivo fiscal secuencial, CUFE criptográfico simulado, código QR DIAN
 * y si es de contado, registra el pago automáticamente.
 */
export class EmitirFacturaDirectaUseCase {
  constructor(private readonly facturacionRepo: IFacturacionRepository) {}

  public async execute(schemaName: string, dto: EmitirFacturaDirectaDTO): Promise<{ factura: FacturaFiscal; mensaje: string }> {
    if (!dto.clienteNombre || !dto.clienteNombre.trim()) {
      throw new Error('El nombre o razón social del cliente es obligatorio');
    }
    if (!dto.clienteNit || !dto.clienteNit.trim()) {
      throw new Error('El NIT o documento del cliente es obligatorio');
    }
    if (!dto.baseGravable || dto.baseGravable <= 0) {
      throw new Error('La base gravable debe ser mayor a 0');
    }

    const tipoDocumento: TipoDocumentoFiscal = dto.tipoDocumento || 'FACTURA_ELECTRONICA_DIAN';
    const prefijo = tipoDocumento === 'DOCUMENTO_EQUIVALENTE_POS' ? 'POS-2026' : 'FE-2026';
    const consecutivo = await this.facturacionRepo.getNextConsecutivo(schemaName, prefijo);

    const porcentajeIva = dto.porcentajeIva !== undefined ? dto.porcentajeIva : 19;
    const totalIva = Math.round(dto.baseGravable * (porcentajeIva / 100));
    const totalPagar = dto.baseGravable + totalIva;

    const fechaEmision = new Date();
    const diasVence = dto.diasVencimiento || 30;
    const fechaVencimiento = new Date(fechaEmision.getTime() + diasVence * 24 * 60 * 60 * 1000);

    const cufe = `CUFE-2026-${uuidv4().replace(/-/g, '').substring(0, 32).toUpperCase()}`;
    const qrCode = `NumFac=${prefijo}-${consecutivo}&FecFac=${fechaEmision.toISOString().split('T')[0]}&ValFac=${dto.baseGravable}&ValIva=${totalIva}&ValTolFac=${totalPagar}&DocAdq=${dto.clienteNit}&CUFE=${cufe}`;

    const estadoInicial: EstadoDian = dto.estadoDian || 'ACEPTADA';
    const metodoPago: MetodoPago = dto.metodoPago || 'EFECTIVO';

    const factura = new FacturaFiscal({
      id: uuidv4(),
      prefijo,
      consecutivo,
      tipoDocumento,
      fechaEmision,
      fechaVencimiento,
      clienteNombre: dto.clienteNombre.trim(),
      clienteNit: dto.clienteNit.trim(),
      baseGravable: dto.baseGravable,
      totalIva,
      totalImpoconsumo: 0,
      propina: 0,
      totalPagar,
      estadoDian: estadoInicial,
      cufe,
      qrCode,
      metodoPago,
      notas: dto.notas?.trim() || undefined,
    });

    await this.facturacionRepo.createFactura(schemaName, factura);

    // Si el estado es ACEPTADA o PAGADA, registrar el pago de contado
    if (estadoInicial === 'ACEPTADA' || estadoInicial === 'PAGADA') {
      await this.facturacionRepo.createPagoFactura(schemaName, {
        id: uuidv4(),
        facturaId: factura.id,
        monto: totalPagar,
        metodoPago,
        referencia: `PAGO-DIRECTO-${consecutivo}`,
        notas: 'Pago de contado en emisión',
      });
    }

    return {
      factura,
      mensaje: `Factura ${factura.numeroCompleto} emitida exitosamente bajo estándar DIAN UBL 2.1`,
    };
  }
}
