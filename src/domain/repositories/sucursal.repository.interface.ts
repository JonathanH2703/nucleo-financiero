import { Sucursal, SucursalProps } from '../entities/sucursal.entity.js';

export interface ISucursalRepository {
  createSucursal(schemaName: string, sucursal: Sucursal): Promise<Sucursal>;
  updateSucursal(schemaName: string, id: string, data: Partial<SucursalProps>): Promise<Sucursal>;
  deleteSucursal(schemaName: string, id: string): Promise<void>;
  getSucursalById(schemaName: string, id: string): Promise<Sucursal | null>;
  listSucursales(schemaName: string): Promise<Sucursal[]>;
}
