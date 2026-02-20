import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMonthName } from '@/hooks/usePeriodSelector';
import { TipoVentaFilter } from './TipoVentaFilter';
import type { RegionalHistorico } from '@/hooks/useRegionalesData';

interface Props {
  data: RegionalHistorico[];
  currentMonth: number;
  currentYear: number;
  prevMonth: number;
  prevYear: number;
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.value)}
          {p.payload?.[`${p.dataKey}_count`] != null && (
            <span className="text-muted-foreground ml-1">(Q: {p.payload[`${p.dataKey}_count`]})</span>
          )}
        </p>
      ))}
    </div>
  );
}

export function RegionalesHistoricoChart({ data, currentMonth, currentYear, prevMonth, prevYear }: Props) {
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const currentLabel = getMonthName(currentMonth);
  const prevLabel = getMonthName(prevMonth);

  // Apply tipo filter
  const filtered = tipoFilter.length === 0
    ? data
    : data.map(r => {
        let currentTotal = 0, previousTotal = 0, currentCount = 0, previousCount = 0;
        tipoFilter.forEach(t => {
          const cd = r.currentDesglose?.[t];
          const pd = r.previousDesglose?.[t];
          if (cd) { currentTotal += cd.valor; currentCount += cd.cantidad; }
          if (pd) { previousTotal += pd.valor; previousCount += pd.cantidad; }
        });
        const variacionValor = previousTotal !== 0 ? ((currentTotal - previousTotal) / Math.abs(previousTotal)) * 100 : currentTotal > 0 ? 100 : 0;
        return { ...r, currentTotal, previousTotal, currentCount, previousCount, variacionValor };
      });

  const chartData = filtered.map(r => ({
    nombre: r.nombre.length > 12 ? r.nombre.substring(0, 12) + '…' : r.nombre,
    [currentLabel]: r.currentTotal,
    [prevLabel]: r.previousTotal,
    [`${currentLabel}_count`]: r.currentCount,
    [`${prevLabel}_count`]: r.previousCount,
    variacion: r.variacionValor,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Comparativo Histórico: {currentLabel} {currentYear} vs {prevLabel} {prevYear}
          </CardTitle>
          <TipoVentaFilter selected={tipoFilter} onChange={setTipoFilter} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {filtered.slice(0, 6).map(r => (
            <div key={r.id} className="flex items-center gap-1 text-xs bg-muted rounded-full px-3 py-1">
              <span className="font-medium">{r.nombre}:</span>
              {r.variacionValor >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={cn(r.variacionValor >= 0 ? 'text-green-600' : 'text-destructive', 'font-semibold')}>
                {r.variacionValor >= 0 ? '+' : ''}{r.variacionValor.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey={currentLabel} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey={prevLabel} fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
