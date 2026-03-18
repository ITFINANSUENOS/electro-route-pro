import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { TipoVentaFilter } from '@/components/regionales/TipoVentaFilter';
import { formatCurrencyFull, formatCurrencyAxis } from '@/utils/formatCurrency';
import type { MonthData } from '@/hooks/useHistoricoData';

const TIPOS_VENTA = [
  { key: 'CONTADO', label: 'Contado', ventaColor: 'hsl(217, 91%, 30%)', metaColor: 'hsl(142, 76%, 28%)' },
  { key: 'FINANSUENOS', label: 'FinanSueños', ventaColor: 'hsl(217, 82%, 48%)', metaColor: 'hsl(142, 64%, 44%)' },
  { key: 'ALIADOS', label: 'Aliados', ventaColor: 'hsl(217, 70%, 72%)', metaColor: 'hsl(142, 52%, 66%)' },
];

interface Props {
  months: MonthData[];
  tipoFilter: string[];
  onTipoFilterChange: (v: string[]) => void;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  const totalVentas = TIPOS_VENTA.reduce((sum, t) => sum + (entry?.[t.key] || 0), 0);
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-2">{entry?.label}</p>
      <p className="text-blue-600 font-medium">Ventas: {formatCurrencyFull(totalVentas)}</p>
      <p className="text-green-600 font-medium">Meta: {formatCurrencyFull(entry?.metaTotal || 0)}</p>
      {entry?.metaTotal > 0 && (
        <p className="text-muted-foreground text-xs">
          Cumplimiento: {((totalVentas / entry.metaTotal) * 100).toFixed(1)}%
        </p>
      )}
      <hr className="my-1.5 border-border/50" />
      {TIPOS_VENTA.slice().reverse().map(t => {
        const val = entry?.[t.key] || 0;
        if (val === 0) return null;
        return (
          <p key={t.key} className="text-muted-foreground text-xs">
            {t.label}: {formatCurrencyFull(val)}
          </p>
        );
      })}
      <p className="text-muted-foreground mt-1 text-xs">Cantidad: {entry?.cantidadTotal?.toLocaleString('es-CO')}</p>
    </div>
  );
}

export function HistoricoBarChart({ months, tipoFilter, onTipoFilterChange }: Props) {
  const activeTipos = tipoFilter.length > 0 ? tipoFilter : TIPOS_VENTA.map(t => t.key);

  const chartData = months.map(m => {
    const row: any = { label: m.label, metaTotal: m.meta, cantidadTotal: m.cantidad };
    const totalVentas = activeTipos.reduce((s, k) => s + (m.desglose[k]?.valor || 0), 0);
    TIPOS_VENTA.forEach(t => {
      const val = activeTipos.includes(t.key) ? (m.desglose[t.key]?.valor || 0) : 0;
      row[t.key] = val;
      row[`meta_${t.key}`] = totalVentas > 0 && activeTipos.includes(t.key)
        ? (val / totalVentas) * m.meta
        : activeTipos.includes(t.key) ? m.meta / activeTipos.length : 0;
    });
    return row;
  });

  const activeItems = TIPOS_VENTA.filter(t => activeTipos.includes(t.key));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Evolución Ventas vs Meta por Mes
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(217, 85%, 42%)' }} />
                <span className="text-sm font-semibold">VENTA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(142, 68%, 38%)' }} />
                <span className="text-sm font-semibold">META</span>
              </div>
            </div>
            <TipoVentaFilter selected={tipoFilter} onChange={onTipoFilterChange} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tickFormatter={formatCurrencyAxis} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                {activeItems.map((t, i) => (
                  <Bar key={t.key} dataKey={t.key} stackId="ventas" fill={t.ventaColor}
                    radius={i === activeItems.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} legendType="none" />
                ))}
                {activeItems.map((t, i) => (
                  <Bar key={`meta_${t.key}`} dataKey={`meta_${t.key}`} stackId="metas" fill={t.metaColor}
                    radius={i === activeItems.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} legendType="none" />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col justify-center gap-2 pl-3 min-w-[120px]">
            {activeItems.slice().reverse().map(t => (
              <div key={t.key} className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: t.ventaColor }} />
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: t.metaColor }} />
                </div>
                <span className="text-muted-foreground">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
