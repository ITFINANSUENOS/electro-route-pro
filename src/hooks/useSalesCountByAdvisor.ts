import { useMemo } from 'react';

interface SaleRecord {
  tipo_documento?: string | null;
  numero_doc?: string | null;
  fecha?: string | null;
  tipo_venta?: string | null;
  forma1_pago?: string | null;
  vtas_ant_i: number;
  codigo_asesor?: string | null;
}

interface SalesCountByAdvisorResult {
  byAdvisor: Record<string, {
    totalCount: number;
    totalValue: number;
    byType: Record<string, { count: number; value: number }>;
  }>;
  byTipoAsesor: Record<string, { count: number; value: number }>;
}

// Normalize tipo_venta
function normalizeTipoVenta(tipo: string | null | undefined): string {
  const n = (tipo || 'DESCONOCIDO').toUpperCase();
  if (n === 'CONVENIO') return 'ALIADOS';
  if (n === 'CREDITO' || n === 'CREDICONTADO') return 'FINANSUENOS';
  return n;
}

/**
 * Groups sales records to count unique sales by advisor
 * using tipo_documento + numero_doc + fecha as grouping key
 */
export function useSalesCountByAdvisor(
  salesData: SaleRecord[],
  tipoAsesorMap: Map<string, string>
): SalesCountByAdvisorResult {
  return useMemo(() => {
    if (!salesData || salesData.length === 0) {
      return {
        byAdvisor: {},
        byTipoAsesor: {},
      };
    }

    // Group by tipo_documento + numero_doc + fecha
    const groups = new Map<string, SaleRecord[]>();

    salesData.forEach(record => {
      const tipoDoc = (record.tipo_documento || 'UNKNOWN').trim();
      const numDoc = (record.numero_doc || 'UNKNOWN').trim();
      const fecha = (record.fecha || 'UNKNOWN').trim();
      const key = `${tipoDoc}|${numDoc}|${fecha}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    });

    const byAdvisor: Record<string, {
      totalCount: number;
      totalValue: number;
      byType: Record<string, { count: number; value: number }>;
    }> = {};

    groups.forEach((records) => {
      const totalValue = records.reduce((sum, r) => sum + (r.vtas_ant_i || 0), 0);

      if (totalValue > 0) {
        const tipoVenta = normalizeTipoVenta(records[0].tipo_venta);
        const codigoAsesor = records[0].codigo_asesor || 'UNKNOWN';

        if (!byAdvisor[codigoAsesor]) {
          byAdvisor[codigoAsesor] = {
            totalCount: 0,
            totalValue: 0,
            byType: {},
          };
        }

        byAdvisor[codigoAsesor].totalCount += 1;
        byAdvisor[codigoAsesor].totalValue += totalValue;

        if (!byAdvisor[codigoAsesor].byType[tipoVenta]) {
          byAdvisor[codigoAsesor].byType[tipoVenta] = { count: 0, value: 0 };
        }
        byAdvisor[codigoAsesor].byType[tipoVenta].count += 1;
        byAdvisor[codigoAsesor].byType[tipoVenta].value += totalValue;
      }
    });

    // Normalize codes helper
    const normalizeCode = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };

    // Calculate by tipo_asesor
    const byTipoAsesor: Record<string, { count: number; value: number }> = {
      INTERNO: { count: 0, value: 0 },
      EXTERNO: { count: 0, value: 0 },
      CORRETAJE: { count: 0, value: 0 },
    };

    Object.entries(byAdvisor).forEach(([codigo, data]) => {
      const normalizedCode = normalizeCode(codigo);
      const isGerencia = codigo === '01' || normalizedCode === '00001';

      let tipoAsesor: string;
      if (isGerencia) {
        tipoAsesor = 'INTERNO';
      } else {
        tipoAsesor = tipoAsesorMap.get(normalizedCode) || tipoAsesorMap.get(codigo) || 'EXTERNO';
      }

      if (byTipoAsesor[tipoAsesor]) {
        byTipoAsesor[tipoAsesor].count += data.totalCount;
        byTipoAsesor[tipoAsesor].value += data.totalValue;
      }
    });

    return {
      byAdvisor,
      byTipoAsesor,
    };
  }, [salesData, tipoAsesorMap]);
}
