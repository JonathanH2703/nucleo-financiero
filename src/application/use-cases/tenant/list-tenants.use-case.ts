import { ITenantRepository } from '../../../domain/repositories/tenant.repository.interface.js';
import { Tenant } from '../../../domain/entities/tenant.entity.js';

export class ListTenantsUseCase {
  constructor(private readonly tenantRepository: ITenantRepository) {}

  public async execute(): Promise<Tenant[]> {
    return await this.tenantRepository.listAll();
  }
}
