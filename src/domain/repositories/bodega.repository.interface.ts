import { Bodega, BodegaProps } from '../entities/bodega.entity.js';

export interface IBodegaRepository {
  createBodega(schemaName: string, bodega: Bodega): Promise<Bodega>;
  updateBodega(schemaName: string, id: string, data: Partial<BodegaProps>): Promise<Bodega>;
  deleteBodega(schemaName: string, id: string): Promise<void>;
  getBodegaById(schemaName: string, id: string): Promise<Bodega | null>;
  listBodegas(schemaName: string, sucursalId?: string): Promise<Bodega[]>;
}
