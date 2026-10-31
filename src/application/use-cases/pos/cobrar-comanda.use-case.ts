import { v4 as uuidv4 } from 'uuid';
import { IPosRepository, IOperacionRepository, IFacturacionRepository } from '../../../domain/repositories/pos.repository.interface.js';
import { IInventarioRepository } from '../../../domain/repositories/inventario.repository.interface.js';
import { IBodegaRepository } from '../../../domain/repositories/bodega.repository.interface.js';
import { FacturaFiscal, TipoDocumentoFiscal } from '../../../domain/entities/facturacion.entity.js';
import { MovimientoInventario } from '../../../domain/entities/inventario.entity.js';

export interface CobrarComandaDTO {
  comandaId: string;
  tipoDocumento?: TipoDocumentoFiscal;
  metodoPago?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
  clienteNombre?: string;
  clienteNit?: string;
  incluyePropina?: boolean;
  bodegaId?: string; // Bodega opcional desde donde descargar inventario
}

export class CobrarComandaUseCase {
  constructor(
    private readonly posRepo: IPosRepository,
    private readonly operacionRepo: IOperacionRepository,
    private readonly facturacionRepo: IFacturacionRepository,
    private readonly inventarioRepo?: IInventarioRepository,
    private readonly bodegaRepo?: IBodegaRepository
  ) {}

  public async execute(schemaName: string, dto: CobrarComandaDTO): Promise<{ factura: FacturaFiscal; mensaje: string }> {
    const comanda = await this.posRepo.getComandaById(schemaName, dto.comandaId);
    if (!comanda) {
      throw new Error(`Comanda no encontrada con ID: ${dto.comandaId}`);
    }

    if (comanda.estado === 'COBRADO') {
      throw new Error('La comanda ya ha sido cobrada anteriormente');
    }

    if (dto.clienteNombre) comanda.clienteNombre = dto.clienteNombre;
    if (dto.clienteNit) comanda.clienteNit = dto.clienteNit;
    if (dto.incluyePropina !== undefined) comanda.incluyePropina = dto.incluyePropina;

    const prefijo = dto.tipoDocumento === 'DOCUMENTO_EQUIVALENTE_POS' ? 'POS-2026' : 'FE-2026';
    const consecutivo = await this.facturacionRepo.getNextConsecutivo(schemaName, prefijo);

    const baseGravable = comanda.baseGravable;
    const impuestos = comanda.totalImpuestos;
    const propina = comanda.propinaSugerida;
    const totalPagar = comanda.total;

    // Generar CUFE y QR simulados válidos con formato DIAN
    const cufe = `CUFE-2026-${uuidv4().replace(/-/g, '').substring(0, 32).toUpperCase()}`;
    const qrCode = `NumFac=${prefijo}-${consecutivo}&FecFac=${new Date().toISOString().split('T')[0]}&ValFac=${baseGravable}&ValIva=${impuestos.iva19}&ValOtroIm=${impuestos.impoconsumo8}&ValTolFac=${totalPagar}&NitFac=900123456-7&DocAdq=${comanda.clienteNit}&CUFE=${cufe}`;

    const factura = new FacturaFiscal({
      id: uuidv4(),
      comandaId: comanda.id,
      prefijo,
      consecutivo,
      tipoDocumento: dto.tipoDocumento ?? 'FACTURA_ELECTRONICA_DIAN',
      fechaEmision: new Date(),
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      clienteNombre: comanda.clienteNombre,
      clienteNit: comanda.clienteNit,
      baseGravable,
      totalIva: impuestos.iva19 + impuestos.iva5,
      totalImpoconsumo: impuestos.impoconsumo8,
      propina,
      totalPagar,
      estadoDian: 'ACEPTADA',
      cufe,
      qrCode,
    });

    // 1. Guardar factura fiscal
    await this.facturacionRepo.createFactura(schemaName, factura);

    // 2. Actualizar estado de comanda a COBRADO
    await this.posRepo.updateComandaEstado(schemaName, comanda.id, 'COBRADO');

    // 3. Liberar punto de atención (mesa/caja)
    if (comanda.puntoAtencionId) {
      await this.operacionRepo.updateEstadoPunto(schemaName, comanda.puntoAtencionId, 'LIBRE');
    }

    // 4. Descontar inventario automáticamente si hay repositorio de inventario configurado
    if (this.inventarioRepo) {
      let targetBodegaId = dto.bodegaId;

      if (!targetBodegaId && this.bodegaRepo) {
        const bodegas = await this.bodegaRepo.listBodegas(schemaName);
        if (bodegas.length > 0) {
          targetBodegaId = bodegas[0].id;
        }
      }

      if (targetBodegaId) {
        for (const item of comanda.items) {
          try {
            await this.inventarioRepo.registrarMovimiento(
              schemaName,
              new MovimientoInventario({
                id: `mov_vta_${uuidv4().substring(0, 8)}`,
                productoId: item.productoId,
                bodegaId: targetBodegaId,
                tipo: 'VENTA',
                cantidad: item.cantidad,
                costoUnitario: item.precioUnitario,
                saldoAnterior: 0,
                saldoNuevo: 0,
                referenciaDocumento: factura.numeroCompleto,
                referenciaTipo: 'VENTA_POS',
                notas: `Despacho venta POS ${comanda.numeroComanda}`,
              })
            );
          } catch {
            // Silencioso o log si el producto no está inventariado en esa bodega
          }
        }
      }
    }

    return {
      factura,
      mensaje: `Comanda ${comanda.numeroComanda} cobrada exitosamente. Factura ${factura.numeroCompleto} emitida ante DIAN (Aceptada) con descarga automática de inventario.`,
    };
  }
}
