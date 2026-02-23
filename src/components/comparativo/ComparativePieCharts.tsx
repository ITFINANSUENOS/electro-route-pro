import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { SalesByTypeData } from '@/hooks/useComparativeData';

interface ComparativePieChartsProps {
  data: SalesByTypeData;
  currentMonthLabel: string;
  previousMonthLabel: string;
}

const TYPE_COLORS: Record<string, string> = {
  CREDITO: 'hsl(217, 91%, 50%)',
  CONTADO: 'hsl(142, 76%, 42%)',
  CREDICONTADO: 'hsl(38, 92%, 50%)',
  ALIADOS: 'hsl(187, 85%, 43%)',
  CONVENIO: 'hsl(187, 85%, 43%)',
};

const FALLBACK_COLORS = [
  'hsl(262, 52%, 47%)',
  'hsl(350, 80%, 55%)',
  'hsl(25, 95%, 53%)',
  'hsl(45, 93%, 47%)',
];

function getColor(tipo: string, index: number) {
  return TYPE_COLORS[tipo] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

const TYPE_LABELS: Record<string, string> = {
  CREDITO: 'Crédito',
  CONTADO: 'Contado',
  CREDICONTADO: 'CrediContado',
  ALIADOS: 'Aliados',
  CONVENIO: 'Aliados',
};

function formatLabel(tipo: string) {
  return TYPE_LABELS[tipo] || tipo;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-CO')}`;
}

function PieSection({
  title,
  entries,
}: {
  title: string;
  entries: { tipo: string; amount: number; count: number }[];
}) {
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const totalCount = entries.reduce((s, e) => s + e.count, 0);

  const chartData = useMemo(
    () => entries.map((e) => ({ name: formatLabel(e.tipo), value: e.amount, count: e.count, tipo: e.tipo })),
    [entries]
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium text-foreground">{d.name}</p>
        <p className="text-muted-foreground">{formatCurrency(d.value)}</p>
        <p className="text-muted-foreground">{d.count} ventas · {pct}%</p>
      </div>
    );
  };

  return (
    <div className="flex-1 min-w-[280px]">
      <h3 className="text-sm font-semibold text-foreground text-center mb-3 capitalize">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="w-[160px] h-[160px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                paddingAngle={2}
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={entry.tipo} fill={getColor(entry.tipo, i)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {chartData.map((entry, i) => (
            <div key={entry.tipo} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getColor(entry.tipo, i) }}
              />
              <span className="text-muted-foreground whitespace-nowrap">
                {entry.name} <span className="text-xs">({entry.count})</span>
              </span>
              <span className="font-medium text-foreground ml-auto whitespace-nowrap">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-1 mt-1 flex justify-between text-xs font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCurrency(total)} <span className="text-muted-foreground font-normal">({totalCount} ventas)</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComparativePieCharts({ data, currentMonthLabel, previousMonthLabel }: ComparativePieChartsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-secondary" />
          Comparativo por Tipo de Venta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-8">
          <PieSection title={currentMonthLabel} entries={data.current} />
          <div className="hidden md:block w-px bg-border" />
          <PieSection title={previousMonthLabel} entries={data.previous} />
        </div>
      </CardContent>
    </Card>
  );
}
