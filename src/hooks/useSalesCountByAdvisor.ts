import { useMemo } from 'react';

interface SaleRecord {
  identifica?: string | null;
  fecha?: string | null;
  tipo_venta?: string | null;
  forma1_pago?: string | null;
  mcn_clase?: string | null;
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

const MAX_DAYS_DIFFERENCE = 7;

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr?.trim()) return null;
  const clean = dateStr.trim();
  
  const parts = clean.split(/[\/\-]/);
  if (parts.length === 3) {
    const [first, second, third] = parts;
    if (first.length <= 2) {
      const year = third.length === 2 ? `20${third}` : third;
      return new Date(`${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`);
    } else {
      return new Date(clean);
    }
  }
  
  return new Date(clean);
}

function daysDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isCreditDocument(mcnClase: string | null | undefined): boolean {
  if (!mcnClase) return false;
  return mcnClase.toUpperCase() === 'DV00';
}

function isSaleDocument(mcnClase: string | null | undefined): boolean {
  if (!mcnClase) return false;
  return mcnClase.toUpperCase() === 'FV00';
}

/**
 * Groups sales records to count unique sales by advisor
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

    // Group records by customer and advisor
    const customerRecords = new Map<string, SaleRecord[]>();
    
    salesData.forEach(record => {
      const customerId = record.identifica?.trim() || 'UNKNOWN';
      if (!customerRecords.has(customerId)) {
        customerRecords.set(customerId, []);
      }
      customerRecords.get(customerId)!.push(record);
    });

    // Track unique sales by advisor
    const byAdvisor: Record<string, {
      totalCount: number;
      totalValue: number;
      byType: Record<string, { count: number; value: number }>;
    }> = {};

    // Process each customer's records
    customerRecords.forEach((records, customerId) => {
      const sortedRecords = records
        .map(r => ({ ...r, parsedDate: parseDate(r.fecha) }))
        .filter(r => r.parsedDate !== null)
        .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());

      const processedIndices = new Set<number>();

      for (let i = 0; i < sortedRecords.length; i++) {
        if (processedIndices.has(i)) continue;

        const baseRecord = sortedRecords[i];
        const baseDate = baseRecord.parsedDate!;
        const baseMcnClase = baseRecord.mcn_clase?.toUpperCase() || 'UNKNOWN';
        const isBaseCredit = isCreditDocument(baseMcnClase);
        const isBaseSale = isSaleDocument(baseMcnClase);

        const groupRecords: typeof sortedRecords = [baseRecord];
        processedIndices.add(i);

        for (let j = i + 1; j < sortedRecords.length; j++) {
          if (processedIndices.has(j)) continue;

          const candidateRecord = sortedRecords[j];
          const candidateDate = candidateRecord.parsedDate!;
          const candidateMcnClase = candidateRecord.mcn_clase?.toUpperCase() || 'UNKNOWN';
          const isCandidateCredit = isCreditDocument(candidateMcnClase);
          const isCandidateSale = isSaleDocument(candidateMcnClase);

          const dateDiff = daysDifference(baseDate, candidateDate);
          if (dateDiff > MAX_DAYS_DIFFERENCE) continue;

          const canGroup = 
            (isBaseCredit && isCandidateSale) || 
            (isBaseSale && isCandidateCredit) ||
            (baseMcnClase === candidateMcnClase);

          if (canGroup) {
            groupRecords.push(candidateRecord);
            processedIndices.add(j);
          }
        }

        const totalValue = groupRecords.reduce((sum, r) => sum + (r.vtas_ant_i || 0), 0);
        
        // Get advisor and sale type info
        const fv00Record = groupRecords.find(r => isSaleDocument(r.mcn_clase));
        const tipoVenta = (fv00Record?.tipo_venta || groupRecords[0].tipo_venta || 'DESCONOCIDO').toUpperCase();
        const codigoAsesor = fv00Record?.codigo_asesor || groupRecords[0].codigo_asesor || 'UNKNOWN';

        // Only count as a sale if total value is positive
        if (totalValue > 0) {
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
      const nombre = ''; // We don't have nombre here
      
      // Check for GERENCIA
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
