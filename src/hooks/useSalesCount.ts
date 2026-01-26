import { useMemo } from 'react';

interface SaleRecord {
  identifica?: string | null;      // cliente_identificacion
  fecha?: string | null;           // fecha
  tipo_venta?: string | null;      // tipo_venta
  forma1_pago?: string | null;     // forma1_pago
  mcn_clase?: string | null;       // mcn_clase
  vtas_ant_i: number;              // vtas_ant_i (can be negative for returns)
}

interface SaleGroup {
  identifica: string;
  mcnClase: string;
  tipoVenta: string;
  forma1Pago: string;
  totalValue: number;
  records: SaleRecord[];
  minDate: Date;
  maxDate: Date;
}

interface SalesCountResult {
  totalSalesCount: number;
  totalSalesValue: number;
  byType: Record<string, { count: number; value: number }>;
  byPaymentMethod: Record<string, { count: number; value: number }>;
}

// Maximum days difference to consider records as part of the same sale
const MAX_DAYS_DIFFERENCE = 7;

// Parse date from various formats
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr?.trim()) return null;
  const clean = dateStr.trim();
  
  // Handle DD/MM/YYYY format
  const parts = clean.split(/[\/\-]/);
  if (parts.length === 3) {
    const [first, second, third] = parts;
    if (first.length <= 2) {
      // DD/MM/YYYY format
      const year = third.length === 2 ? `20${third}` : third;
      return new Date(`${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`);
    } else {
      // YYYY-MM-DD format
      return new Date(clean);
    }
  }
  
  return new Date(clean);
}

// Calculate days difference between two dates
function daysDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Check if a record is a credit-related document (FNZ/Finansueños)
function isCreditDocument(mcnClase: string | null | undefined): boolean {
  if (!mcnClase) return false;
  return mcnClase.toUpperCase() === 'DV00';
}

// Check if a record is a sale document
function isSaleDocument(mcnClase: string | null | undefined): boolean {
  if (!mcnClase) return false;
  return mcnClase.toUpperCase() === 'FV00';
}

/**
 * Groups sales records to count unique sales based on:
 * - Same customer (IDENTIFICA/cédula)
 * - Same or close dates (≤7 days difference)
 * - Same MCNCLASE (except for credit where DV00+FV00 = 1 sale)
 */
export function useSalesCount(salesData: SaleRecord[]): SalesCountResult {
  return useMemo(() => {
    if (!salesData || salesData.length === 0) {
      return {
        totalSalesCount: 0,
        totalSalesValue: 0,
        byType: {},
        byPaymentMethod: {},
      };
    }

    // Group records by customer and analyze for unique sales
    const customerRecords = new Map<string, SaleRecord[]>();
    
    // First pass: group by customer identifier
    salesData.forEach(record => {
      const customerId = record.identifica?.trim() || 'UNKNOWN';
      if (!customerRecords.has(customerId)) {
        customerRecords.set(customerId, []);
      }
      customerRecords.get(customerId)!.push(record);
    });

    const uniqueSales: SaleGroup[] = [];

    // Second pass: for each customer, group records into unique sales
    customerRecords.forEach((records, customerId) => {
      // Sort records by date
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

        // Find related records for this sale
        for (let j = i + 1; j < sortedRecords.length; j++) {
          if (processedIndices.has(j)) continue;

          const candidateRecord = sortedRecords[j];
          const candidateDate = candidateRecord.parsedDate!;
          const candidateMcnClase = candidateRecord.mcn_clase?.toUpperCase() || 'UNKNOWN';
          const isCandidateCredit = isCreditDocument(candidateMcnClase);
          const isCandidateSale = isSaleDocument(candidateMcnClase);

          // Check date proximity
          const dateDiff = daysDifference(baseDate, candidateDate);
          if (dateDiff > MAX_DAYS_DIFFERENCE) continue;

          // For credits: DV00 + FV00 can be grouped together
          // For regular sales: must have same MCNCLASE
          const canGroup = 
            (isBaseCredit && isCandidateSale) || 
            (isBaseSale && isCandidateCredit) ||
            (baseMcnClase === candidateMcnClase);

          if (canGroup) {
            groupRecords.push(candidateRecord);
            processedIndices.add(j);
          }
        }

        // Create the sale group
        const totalValue = groupRecords.reduce((sum, r) => sum + (r.vtas_ant_i || 0), 0);
        
        // Determine the tipo_venta from the FV00 record if available, otherwise from any record
        const fv00Record = groupRecords.find(r => isSaleDocument(r.mcn_clase));
        const tipoVenta = fv00Record?.tipo_venta || groupRecords[0].tipo_venta || 'DESCONOCIDO';
        const forma1Pago = fv00Record?.forma1_pago || groupRecords[0].forma1_pago || 'DESCONOCIDO';

        // Only count as a sale if total value is positive (net sale)
        if (totalValue > 0) {
          uniqueSales.push({
            identifica: customerId,
            mcnClase: baseMcnClase,
            tipoVenta: tipoVenta?.toUpperCase() || 'DESCONOCIDO',
            forma1Pago: forma1Pago?.toUpperCase() || 'DESCONOCIDO',
            totalValue,
            records: groupRecords,
            minDate: baseDate,
            maxDate: groupRecords.reduce(
              (max, r) => r.parsedDate! > max ? r.parsedDate! : max,
              baseDate
            ),
          });
        }
      }
    });

    // Calculate totals by type and payment method
    const byType: Record<string, { count: number; value: number }> = {};
    const byPaymentMethod: Record<string, { count: number; value: number }> = {};

    uniqueSales.forEach(sale => {
      // By tipo_venta
      if (!byType[sale.tipoVenta]) {
        byType[sale.tipoVenta] = { count: 0, value: 0 };
      }
      byType[sale.tipoVenta].count += 1;
      byType[sale.tipoVenta].value += sale.totalValue;

      // By forma1_pago
      if (!byPaymentMethod[sale.forma1Pago]) {
        byPaymentMethod[sale.forma1Pago] = { count: 0, value: 0 };
      }
      byPaymentMethod[sale.forma1Pago].count += 1;
      byPaymentMethod[sale.forma1Pago].value += sale.totalValue;
    });

    return {
      totalSalesCount: uniqueSales.length,
      totalSalesValue: uniqueSales.reduce((sum, s) => sum + s.totalValue, 0),
      byType,
      byPaymentMethod,
    };
  }, [salesData]);
}

/**
 * Transform database ventas records to the format expected by useSalesCount
 */
export function transformVentasForCounting(ventas: Array<{
  cliente_identificacion?: string | null;
  fecha?: string | null;
  tipo_venta?: string | null;
  forma1_pago?: string | null;
  mcn_clase?: string | null;
  vtas_ant_i: number;
}>): SaleRecord[] {
  return ventas.map(v => ({
    identifica: v.cliente_identificacion,
    fecha: v.fecha,
    tipo_venta: v.tipo_venta,
    forma1_pago: v.forma1_pago,
    mcn_clase: v.mcn_clase,
    vtas_ant_i: v.vtas_ant_i,
  }));
}
