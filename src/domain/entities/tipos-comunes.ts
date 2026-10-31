export type UnidadMedida =
  | 'UNIDAD'
  | 'KG'
  | 'G'
  | 'LB'
  | 'LITRO'
  | 'ML'
  | 'GALON'
  | 'METRO'
  | 'CM'
  | 'CAJA'
  | 'BULTO'
  | 'PAQUETE'
  | 'DOCENA'
  | 'PORCION'
  | 'KG_GRAMOS'; // Compatibilidad con catálogo previo

export type TipoImpuesto = 'IVA_19' | 'IVA_5' | 'IMPOCONSUMO_8' | 'EXENTO';

export type TipoDocumentoIdentidad = 'NIT' | 'CC' | 'CE' | 'TI' | 'PASAPORTE' | 'RUT';

export type TipoContribuyente =
  | 'GRAN_CONTRIBUYENTE'
  | 'AUTORRETENEDOR'
  | 'REGIMEN_SIMPLE'
  | 'RESPONSABLE_IVA'
  | 'NO_RESPONSABLE_IVA'
  | 'PERSONA_NATURAL';

export type TipoCuenta = 'AHORROS' | 'CORRIENTE';

export type TipoBodega = 'PRINCIPAL' | 'TRANSITO' | 'DEVOLUCIONES' | 'MATERIA_PRIMA';

export type TipoMovimientoInventario =
  | 'ENTRADA'
  | 'SALIDA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'TRASLADO_ENTRADA'
  | 'TRASLADO_SALIDA'
  | 'DEVOLUCION'
  | 'VENTA';

export type EstadoAjusteInventario = 'PENDIENTE' | 'CONFIRMADO' | 'REVERTIDO';

export type TipoAjuste = 'CONTEO_FISICO' | 'MERMA' | 'ROTURA' | 'VENCIMIENTO' | 'OTRO';

export type EstadoOrdenCompra = 'BORRADOR' | 'ENVIADA' | 'RECIBIDA_PARCIAL' | 'RECIBIDA' | 'CANCELADA';

export type EstadoCuentaPorPagar = 'PENDIENTE' | 'PAGADA' | 'PARCIAL' | 'VENCIDA' | 'ANULADA';
