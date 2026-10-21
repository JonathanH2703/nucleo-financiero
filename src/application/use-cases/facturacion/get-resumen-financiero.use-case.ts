import { IFacturacionRepository } from '../../../domain/repositories/pos.repository.interface.js';

/**
 * Use Case: Obtener resumen financiero consolidado para dashboards.
 * Agrega totales por estado en una sola query SQL (sin N+1).
 */
export class GetResumenFinancieroUseCase {
  constructor(private readonly facturacionRepo: IFacturacionRepository) {}

  public async execute(schemaName: string): Promise<{
    totalFacturado: number;
    totalCobrado: number;
    totalPendiente: number;
    totalVencido: number;
    totalAnulado: number;
    facturasEsteMes: number;
    ingresoEsteMes: number;
    cuentasPorCobrar: number;
  }> {
    return await this.facturacionRepo.getResumenFinanciero(schemaName);
  }
}
