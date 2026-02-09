import { dataService } from '@/services';

/**
 * Mapeo de tipo de asesor a campo de porcentaje
 * - INTERNO -> porcentaje_aumento_1
 * - EXTERNO -> porcentaje_aumento_2
 * - CORRETAJE -> porcentaje_aumento_3
 */
const TIPO_ASESOR_TO_PORCENTAJE_FIELD: Record<string, 'porcentaje_aumento_1' | 'porcentaje_aumento_2' | 'porcentaje_aumento_3'> = {
  INTERNO: 'porcentaje_aumento_1',
  EXTERNO: 'porcentaje_aumento_2',
  CORRETAJE: 'porcentaje_aumento_3',
};

export interface MetaQuantityConfig {
  promedios: Map<string, number>;
  porcentajes: Map<string, { aumento1: number; aumento2: number; aumento3: number }>;
}

export interface MetaQuantityResult {
  valorMeta: number;
  tipoAsesor: string;
  tipoVenta: string;
  porcentajeAumento: number;
  valorConAumento: number;
  valorPromedio: number;
  cantidadCalculada: number;
  cantidadFinal: number;
}

/**
 * Calcula la cantidad de ventas necesarias para cumplir una meta
 * 
 * Fórmula:
 * 1. Meta con aumento = valorMeta * (1 + porcentajeAumento/100)
 * 2. Cantidad = Meta con aumento / valorPromedio
 * 3. Cantidad final = Math.ceil(Cantidad)
 * 
 * @param valorMeta - Valor de la meta en pesos
 * @param tipoAsesor - Tipo de asesor (INTERNO, EXTERNO, CORRETAJE)
 * @param tipoVenta - Tipo de venta (CONTADO, CREDICONTADO, CREDITO, ALIADOS)
 * @param regionalId - ID de la regional
 * @param config - Configuración precargada de promedios y porcentajes
 * @returns Resultado del cálculo con desglose
 */
export function calculateMetaQuantity(
  valorMeta: number,
  tipoAsesor: string,
  tipoVenta: string,
  regionalId: string,
  config: MetaQuantityConfig
): MetaQuantityResult {
  const porcentajesRegional = config.porcentajes.get(regionalId);
  let porcentajeAumento = 0;
  
  if (porcentajesRegional) {
    const tipoAsesorUpper = tipoAsesor.toUpperCase();
    if (tipoAsesorUpper === 'INTERNO') {
      porcentajeAumento = porcentajesRegional.aumento1;
    } else if (tipoAsesorUpper === 'EXTERNO') {
      porcentajeAumento = porcentajesRegional.aumento2;
    } else if (tipoAsesorUpper === 'CORRETAJE') {
      porcentajeAumento = porcentajesRegional.aumento3;
    }
  }

  const promedioKey = `${regionalId}_${tipoAsesor.toUpperCase()}_${tipoVenta.toUpperCase()}`;
  const valorPromedio = config.promedios.get(promedioKey) || 0;
  const valorConAumento = valorMeta * (1 + porcentajeAumento / 100);

  let cantidadCalculada = 0;
  let cantidadFinal = 0;

  if (valorPromedio > 0) {
    cantidadCalculada = valorConAumento / valorPromedio;
    cantidadFinal = Math.ceil(cantidadCalculada);
  }

  return {
    valorMeta,
    tipoAsesor,
    tipoVenta,
    porcentajeAumento,
    valorConAumento,
    valorPromedio,
    cantidadCalculada,
    cantidadFinal,
  };
}

/**
 * Calcula las cantidades para todas las metas de un asesor
 * 
 * @param metasAsesor - Array de metas del asesor { tipo_meta, valor_meta }
 * @param tipoAsesor - Tipo de asesor
 * @param regionalId - ID de la regional
 * @param config - Configuración precargada
 * @returns Map de tipo_venta -> MetaQuantityResult
 */
export function calculateAdvisorMetaQuantities(
  metasAsesor: Array<{ tipo_meta: string | null; valor_meta: number }>,
  tipoAsesor: string,
  regionalId: string,
  config: MetaQuantityConfig
): Map<string, MetaQuantityResult> {
  const results = new Map<string, MetaQuantityResult>();

  metasAsesor.forEach(meta => {
    if (meta.tipo_meta && meta.valor_meta > 0) {
      const result = calculateMetaQuantity(
        meta.valor_meta,
        tipoAsesor,
        meta.tipo_meta,
        regionalId,
        config
      );
      results.set(meta.tipo_meta.toUpperCase(), result);
    }
  });

  return results;
}

/**
 * Carga la configuración de promedios y porcentajes desde la base de datos
 */
export async function loadMetaQuantityConfig(): Promise<MetaQuantityConfig> {
  const promedios = new Map<string, number>();
  const porcentajes = new Map<string, { aumento1: number; aumento2: number; aumento3: number }>();

  const { data: promediosData, error: promediosError } = await (dataService
    .from('config_metas_promedio')
    .select('regional_id, tipo_asesor, tipo_venta, valor_promedio') as any);

  if (!promediosError && promediosData) {
    promediosData.forEach((p: any) => {
      const key = `${p.regional_id}_${p.tipo_asesor.toUpperCase()}_${p.tipo_venta.toUpperCase()}`;
      promedios.set(key, p.valor_promedio);
    });
  }

  const { data: porcentajesData, error: porcentajesError } = await (dataService
    .from('config_metas_porcentajes')
    .select('regional_id, porcentaje_aumento_1, porcentaje_aumento_2, porcentaje_aumento_3') as any);

  if (!porcentajesError && porcentajesData) {
    porcentajesData.forEach((p: any) => {
      porcentajes.set(p.regional_id, {
        aumento1: p.porcentaje_aumento_1,
        aumento2: p.porcentaje_aumento_2,
        aumento3: p.porcentaje_aumento_3,
      });
    });
  }

  return { promedios, porcentajes };
}

/**
 * Calcula el total de cantidades para un asesor (suma de todas las metas)
 */
export function calculateTotalQuantity(results: Map<string, MetaQuantityResult>): number {
  let total = 0;
  results.forEach(result => {
    total += result.cantidadFinal;
  });
  return total;
}

/**
 * Formatea el resultado del cálculo para mostrar en UI
 */
export function formatMetaQuantityBreakdown(result: MetaQuantityResult): string {
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `Meta: ${formatter.format(result.valorMeta)} + ${result.porcentajeAumento}% = ${formatter.format(result.valorConAumento)} ÷ ${formatter.format(result.valorPromedio)} = ${result.cantidadCalculada.toFixed(2)} → ${result.cantidadFinal} unidades`;
}
