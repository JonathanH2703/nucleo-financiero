import { v4 as uuidv4 } from 'uuid';
import { ICatalogoRepository } from '../../../domain/repositories/catalogo.repository.interface.js';
import { Categoria, CategoriaProps } from '../../../domain/entities/catalogo.entity.js';

export class CreateCategoriaUseCase {
  constructor(private readonly catalogoRepo: ICatalogoRepository) { }

  public async execute(schemaName: string, props: Omit<CategoriaProps, 'id'> & { id?: string }): Promise<Categoria> {
    if (!props.nombre || !props.nombre.trim()) {
      throw new Error('El nombre de la categoría es obligatorio.');
    }

    const cat = new Categoria({
      ...props,
      id: props.id || `cat_${uuidv4().substring(0, 8)}`,
    });

    return this.catalogoRepo.createCategoria(schemaName, cat);
  }
}

