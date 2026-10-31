import { UnidadMedida } from '../entities/tipos-comunes.js';

/**
 * Tabla de factores de conversión a unidad canónica según tipo de magnitud:
 * Masa: g (gramo)
 * Volumen: ml (mililitro)
 * Longitud: cm (centímetro)
 * Conteo/Empaque: unidad
 */
const CANONICAL_UNITS: Record<UnidadMedida, { tipo: 'MASA' | 'VOLUMEN' | 'LONGITUD' | 'CONTEO'; factor: number }> = {
  // Masa (Base: g)
  G: { tipo: 'MASA', factor: 1 },
  KG: { tipo: 'MASA', factor: 1000 },
  KG_GRAMOS: { tipo: 'MASA', factor: 1000 },
  LB: { tipo: 'MASA', factor: 500 }, // Libra comercial colombiana (500g) o 453.59g

  // Volumen (Base: ml)
  ML: { tipo: 'VOLUMEN', factor: 1 },
  LITRO: { tipo: 'VOLUMEN', factor: 1000 },
  GALON: { tipo: 'VOLUMEN', factor: 3785.41 },

  // Longitud (Base: cm)
  CM: { tipo: 'LONGITUD', factor: 1 },
  METRO: { tipo: 'LONGITUD', factor: 100 },

  // Conteo
  UNIDAD: { tipo: 'CONTEO', factor: 1 },
  PORCION: { tipo: 'CONTEO', factor: 1 },
  DOCENA: { tipo: 'CONTEO', factor: 12 },
  PAQUETE: { tipo: 'CONTEO', factor: 1 },
  CAJA: { tipo: 'CONTEO', factor: 1 },
  BULTO: { tipo: 'CONTEO', factor: 1 },
};

export class ConversionUnidadesService {
  /**
   * Determina si dos unidades de medida son compatibles entre sí para conversión matemática estándar
   */
  public static sonCompatibles(origen: UnidadMedida, destino: UnidadMedida): boolean {
    const metaOrigen = CANONICAL_UNITS[origen];
    const metaDestino = CANONICAL_UNITS[destino];
    if (!metaOrigen || !metaDestino) return false;
    return metaOrigen.tipo === metaDestino.tipo;
  }

  /**
   * Convierte una cantidad de una unidad origen a una unidad destino estándar si son del mismo tipo físico
   */
  public static convertir(cantidad: number, origen: UnidadMedida, destino: UnidadMedida): number {
    if (origen === destino) return cantidad;

    const metaOrigen = CANONICAL_UNITS[origen];
    const metaDestino = CANONICAL_UNITS[destino];

    if (!metaOrigen || !metaDestino || metaOrigen.tipo !== metaDestino.tipo) {
      throw new Error(`No es posible convertir directamente de ${origen} a ${destino} sin un factor de densidad o conversión personalizado.`);
    }

    const valorCanonico = cantidad * metaOrigen.factor;
    return valorCanonico / metaDestino.factor;
  }

  /**
   * Aplica un factor de conversión personalizado (por ejemplo, para empaques: 1 CAJA = 24 UNIDADES)
   */
  public static aplicarFactor(cantidad: number, factor: number): number {
    if (factor <= 0) throw new Error('El factor de conversión debe ser mayor a cero.');
    return cantidad * factor;
  }
}
