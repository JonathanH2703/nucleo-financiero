export type TipoDocumentoFiscal = 'FACTURA_ELECTRONICA_DIAN' | 'DOCUMENTO_EQUIVALENTE_POS' | 'NOTA_CREDITO_DIAN';
export type EstadoDian = 'ACEPTADA' | 'PAGADA' | 'PENDIENTE' | 'RECHAZADA_DIAN' | 'PAGO_PARCIAL' | 'VENCIDA' | 'ANULADA';
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO' | 'NEQUI' | 'DAVIPLATA';

export interface FacturaFiscalProps {
  id: string;
  comandaId?: string;
  prefijo: string;
  consecutivo: number;
  tipoDocumento?: TipoDocumentoFiscal;
  fechaEmision?: Date;
  fechaVencimiento?: Date;
  clienteNombre: string;
  clienteNit: string;
  baseGravable: number;
  totalIva: number;
  totalImpoconsumo: number;
  propina?: number;
  totalPagar: number;
  estadoDian?: EstadoDian;
  cufe?: string;
  qrCode?: string;
  archivoXmlKey?: string;
  archivoPdfKey?: string;
  metodoPago?: MetodoPago | string;
  notas?: string;
  facturaReferenciaId?: string; // Para notas crédito: referencia a la factura original
}

export class FacturaFiscal {
  public readonly id: string;
  public readonly comandaId?: string;
  public readonly prefijo: string;
  public readonly consecutivo: number;
  public readonly tipoDocumento: TipoDocumentoFiscal;
  public readonly fechaEmision: Date;
  public readonly fechaVencimiento: Date;
  public readonly clienteNombre: string;
  public readonly clienteNit: string;
  public readonly baseGravable: number;
  public readonly totalIva: number;
  public readonly totalImpoconsumo: number;
  public readonly propina: number;
  public readonly totalPagar: number;
  public estadoDian: EstadoDian;
  public cufe?: string;
  public qrCode?: string;
  public archivoXmlKey?: string;
  public archivoPdfKey?: string;
  public readonly metodoPago: string;
  public readonly notas?: string;
  public readonly facturaReferenciaId?: string;

  constructor(props: FacturaFiscalProps) {
    this.id = props.id;
    this.comandaId = props.comandaId;
    this.prefijo = props.prefijo;
    this.consecutivo = props.consecutivo;
    this.tipoDocumento = props.tipoDocumento ?? 'FACTURA_ELECTRONICA_DIAN';
    this.fechaEmision = props.fechaEmision ?? new Date();
    this.fechaVencimiento = props.fechaVencimiento ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    this.clienteNombre = props.clienteNombre;
    this.clienteNit = props.clienteNit;
    this.baseGravable = props.baseGravable;
    this.totalIva = props.totalIva;
    this.totalImpoconsumo = props.totalImpoconsumo;
    this.propina = props.propina ?? 0;
    this.totalPagar = props.totalPagar;
    this.estadoDian = props.estadoDian ?? 'ACEPTADA';
    this.cufe = props.cufe;
    this.qrCode = props.qrCode;
    this.archivoXmlKey = props.archivoXmlKey;
    this.archivoPdfKey = props.archivoPdfKey;
    this.metodoPago = props.metodoPago ?? 'EFECTIVO';
    this.notas = props.notas;
    this.facturaReferenciaId = props.facturaReferenciaId;
  }

  public get numeroCompleto(): string {
    return `${this.prefijo}-${String(this.consecutivo).padStart(6, '0')}`;
  }

  public get esNotaCredito(): boolean {
    return this.tipoDocumento === 'NOTA_CREDITO_DIAN';
  }
}
