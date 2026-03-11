import { useMemo } from 'react';

interface SaleRecord {
  tipo_documento?: string | null;
  numero_doc?: string | null;
  fecha?: string | null;
  tipo_venta?: string | null;
  forma1_pago?: string | null;
  vtas_ant_i: number;
}

interface SalesCountResult {
  totalSalesCount: number;
  totalSalesValue: number;
  byType: Record<string, { count: number; value: number }>;
  byPaymentMethod: Record<string, { count: number; value: number }>;
}

// Normalize tipo_venta: CONVENIO → ALIADOS, CREDITO/CREDICONTADO → FINANSUENOS
function normalizeTipoVenta(tipo: string | null | undefined): string {
  const normalized = (tipo || 'DESCONOCIDO').toUpperCase();
  if (normalized === 'CONVENIO') return 'ALIADOS';
  if (normalized === 'CREDITO' || normalized === 'CREDICONTADO') return 'FINANSUENOS';
  return normalized;
}

/**
 * Groups sales records to count unique sales based on:
 * - Same tipo_documento + numero_doc + fecha = 1 unique sale
 * - Sum all vtas_ant_i within the group
 * - Only count if net total > 0
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

    const byType: Record<string, { count: number; value: number }> = {};
    const byPaymentMethod: Record<string, { count: number; value: number }> = {};
    let totalSalesCount = 0;
    let totalSalesValue = 0;

    groups.forEach((records) => {
      const totalValue = records.reduce((sum, r) => sum + (r.vtas_ant_i || 0), 0);

      // Only count as a sale if net total > 0
      if (totalValue > 0) {
        const tipoVenta = normalizeTipoVenta(records[0].tipo_venta);
        const forma1Pago = (records[0].forma1_pago || 'DESCONOCIDO').toUpperCase();

        totalSalesCount += 1;
        totalSalesValue += totalValue;

        if (!byType[tipoVenta]) {
          byType[tipoVenta] = { count: 0, value: 0 };
        }
        byType[tipoVenta].count += 1;
        byType[tipoVenta].value += totalValue;

        if (!byPaymentMethod[forma1Pago]) {
          byPaymentMethod[forma1Pago] = { count: 0, value: 0 };
        }
        byPaymentMethod[forma1Pago].count += 1;
        byPaymentMethod[forma1Pago].value += totalValue;
      }
    });

    return {
      totalSalesCount,
      totalSalesValue,
      byType,
      byPaymentMethod,
    };
  }, [salesData]);
}

/**
 * Transform database ventas records to the format expected by useSalesCount
 */
export function transformVentasForCounting(ventas: Array<{
  tipo_documento?: string | null;
  numero_doc?: string | null;
  fecha?: string | null;
  tipo_venta?: string | null;
  forma1_pago?: string | null;
  vtas_ant_i: number;
}>): SaleRecord[] {
  return ventas.map(v => ({
    tipo_documento: v.tipo_documento,
    numero_doc: v.numero_doc,
    fecha: v.fecha,
    tipo_venta: v.tipo_venta,
    forma1_pago: v.forma1_pago,
    vtas_ant_i: v.vtas_ant_i,
  }));
}
