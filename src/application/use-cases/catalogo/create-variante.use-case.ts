import { v4 as uuidv4 } from 'uuid';
import { ICatalogoRepository } from '../../../domain/repositories/catalogo.repository.interface.js';
import { ProductoVariante, ProductoVarianteProps } from '../../../domain/entities/producto-variante.entity.js';
import { ConversionUnidadesService } from '../../../domain/services/conversion-unidades.service.js';

export class CreateVarianteUseCase {
  constructor(private readonly catalogoRepo: ICatalogoRepository) { }

  public async execute(
    schemaName: string,
    props: Omit<ProductoVarianteProps, 'id'> & { id?: string }
  ): Promise<ProductoVariante> {
    const producto = await this.catalogoRepo.getProductoById(schemaName, props.productoId);
    if (!producto) {
      throw new Error(`Producto base con ID ${props.productoId} no encontrado.`);
    }

    let factor = props.factorConversion;
    // Si no se envió factor de conversión explícito pero las unidades son físicamente compatibles, calcularlo automáticamente
    if (!factor && props.unidadMedida && ConversionUnidadesService.sonCompatibles(props.unidadMedida, producto.unidadMedida)) {
      factor = ConversionUnidadesService.convertir(1, props.unidadMedida, producto.unidadMedida);
    }

    const variante = new ProductoVariante({
      ...props,
      id: props.id || `var_${uuidv4().substring(0, 8)}`,
      factorConversion: factor || 1,
    });

    return this.catalogoRepo.createVariante(schemaName, variante);
  }
}

