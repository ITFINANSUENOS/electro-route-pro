import { DollarSign, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { formatCurrencyShort, formatCurrencyFull } from '@/utils/formatCurrency';
import type { MonthData } from '@/hooks/useHistoricoData';

const TIPOS = [
  { key: 'CONTADO', label: 'Contado', color: 'hsl(217, 91%, 30%)' },
  { key: 'FINANSUENOS', label: 'FinanSueños', color: 'hsl(217, 82%, 48%)' },
  { key: 'ALIADOS', label: 'Aliados', color: 'hsl(217, 70%, 72%)' },
];

interface Props {
  months: MonthData[];
}

export function HistoricoKPICards({ months }: Props) {
  if (months.length === 0) return null;

  const totalAcumulado = months.reduce((s, m) => s + m.ventaTotal, 0);
  const totalCantidad = months.reduce((s, m) => s + m.cantidad, 0);
  const promedioMensual = totalAcumulado / months.length;
  const promedioCantidad = Math.round(totalCantidad / months.length);

  // Best month
  const bestMonth = months.reduce((best, m) => m.ventaTotal > best.ventaTotal ? m : best, months[0]);

  // Trend: last month vs average
  const lastMonth = months[months.length - 1];
  const trendValue = promedioMensual > 0
    ? ((lastMonth.ventaTotal - promedioMensual) / promedioMensual) * 100
    : 0;

  // Tooltip builders
  const totalTooltip = TIPOS.map(t => {
    const val = months.reduce((s, m) => s + (m.desglose[t.key]?.valor || 0), 0);
    const qty = months.reduce((s, m) => s + (m.desglose[t.key]?.cantidad || 0), 0);
    return { label: `${t.label}`, value: `${formatCurrencyFull(val)} (${qty.toLocaleString('es-CO')} uds)`, color: t.color };
  });

  const avgTooltip = TIPOS.map(t => {
    const val = months.reduce((s, m) => s + (m.desglose[t.key]?.valor || 0), 0) / months.length;
    const qty = Math.round(months.reduce((s, m) => s + (m.desglose[t.key]?.cantidad || 0), 0) / months.length);
    return { label: t.label, value: `${formatCurrencyFull(val)} (${qty.toLocaleString('es-CO')} uds)`, color: t.color };
  });

  const bestTooltip = TIPOS.map(t => {
    const val = bestMonth.desglose[t.key]?.valor || 0;
    const qty = bestMonth.desglose[t.key]?.cantidad || 0;
    return { label: t.label, value: `${formatCurrencyFull(val)} (${qty.toLocaleString('es-CO')} uds)`, color: t.color };
  });

  const trendTooltip = TIPOS.map(t => {
    const lastVal = lastMonth.desglose[t.key]?.valor || 0;
    const avgVal = months.reduce((s, m) => s + (m.desglose[t.key]?.valor || 0), 0) / months.length;
    const variation = avgVal > 0 ? ((lastVal - avgVal) / avgVal) * 100 : 0;
    return { label: t.label, value: `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`, color: t.color };
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <KpiCard
        title="Total Acumulado"
        value={formatCurrencyShort(totalAcumulado)}
        subtitle={`${totalCantidad.toLocaleString('es-CO')} ventas en ${months.length} meses`}
        icon={DollarSign}
        tooltipTitle="Desglose por Tipo de Venta"
        tooltipItems={totalTooltip}
      />
      <KpiCard
        title="Promedio Mensual"
        value={formatCurrencyShort(promedioMensual)}
        subtitle={`~${promedioCantidad.toLocaleString('es-CO')} ventas/mes`}
        icon={BarChart3}
        tooltipTitle="Promedio Mensual por Tipo"
        tooltipItems={avgTooltip}
      />
      <KpiCard
        title="Mejor Mes"
        value={bestMonth.label}
        subtitle={formatCurrencyFull(bestMonth.ventaTotal)}
        icon={Calendar}
        tooltipTitle={`Detalle ${bestMonth.label}`}
        tooltipItems={bestTooltip}
      />
      <KpiCard
        title="Tendencia"
        value={`${lastMonth.label}`}
        subtitle="vs promedio histórico"
        icon={TrendingUp}
        trend={{ value: Math.round(trendValue * 10) / 10, label: 'vs promedio' }}
        status={trendValue >= 0 ? 'success' : 'danger'}
        tooltipTitle="Variación por Tipo"
        tooltipItems={trendTooltip}
      />
    </div>
  );
}
