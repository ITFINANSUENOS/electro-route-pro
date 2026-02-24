import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  'hsl(160, 60%, 45%)',
  'hsl(200, 70%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(320, 65%, 50%)',
];

function getColor(key: string, index: number, isBreakdown: boolean) {
  if (!isBreakdown) return TYPE_COLORS[key] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
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

interface ChartEntry {
  name: string;
  key: string;
  value: number;
  count: number;
}

function PieSection({
  title,
  entries,
  isBreakdown,
  onSliceClick,
}: {
  title: string;
  entries: ChartEntry[];
  isBreakdown: boolean;
  onSliceClick?: (key: string) => void;
}) {
  const total = entries.reduce((s, e) => s + e.value, 0);
  const totalCount = entries.reduce((s, e) => s + e.count, 0);

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
                data={entries}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                paddingAngle={2}
                strokeWidth={0}
                style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                onClick={(_, index) => onSliceClick?.(entries[index].key)}
              >
                {entries.map((entry, i) => (
                  <Cell key={entry.key} fill={getColor(entry.key, i, isBreakdown)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 text-sm flex-1">
          {entries.map((entry, i) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
            return (
              <div
                key={entry.key}
                className={`flex items-center gap-2 ${onSliceClick ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1' : ''}`}
                onClick={() => onSliceClick?.(entry.key)}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColor(entry.key, i, isBreakdown) }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-foreground text-xs font-medium truncate block">{entry.name}</span>
                  <span className="text-muted-foreground text-xs">{entry.count} ventas</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-semibold text-foreground text-xs">{pct}%</span>
                  <span className="text-muted-foreground text-xs block">{formatCurrency(entry.value)}</span>
                </div>
              </div>
            );
          })}
          <div className="border-t border-border pt-1 mt-1 flex justify-between text-xs font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCurrency(total)} <span className="text-muted-foreground font-normal">({totalCount})</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComparativePieCharts({ data, currentMonthLabel, previousMonthLabel }: ComparativePieChartsProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const currentEntries: ChartEntry[] = useMemo(() => {
    if (!selectedType) {
      return data.current.map(e => ({ name: formatLabel(e.tipo), key: e.tipo, value: e.amount, count: e.count }));
    }
    const breakdown = data.currentBreakdown[selectedType] || [];
    return breakdown.map(e => ({ name: e.formaPago, key: e.formaPago, value: e.amount, count: e.count }));
  }, [data, selectedType]);

  const previousEntries: ChartEntry[] = useMemo(() => {
    if (!selectedType) {
      return data.previous.map(e => ({ name: formatLabel(e.tipo), key: e.tipo, value: e.amount, count: e.count }));
    }
    const breakdown = data.previousBreakdown[selectedType] || [];
    return breakdown.map(e => ({ name: e.formaPago, key: e.formaPago, value: e.amount, count: e.count }));
  }, [data, selectedType]);

  const handleSliceClick = (key: string) => {
    if (!selectedType) setSelectedType(key);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {selectedType && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedType(null)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-secondary" />
            {selectedType ? `Desglose: ${formatLabel(selectedType)}` : 'Comparativo por Tipo de Venta'}
          </CardTitle>
        </div>
        {selectedType && (
          <p className="text-xs text-muted-foreground ml-9">Haz clic en el botón ← para volver</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-8">
          <PieSection
            title={currentMonthLabel}
            entries={currentEntries}
            isBreakdown={!!selectedType}
            onSliceClick={!selectedType ? handleSliceClick : undefined}
          />
          <div className="hidden md:block w-px bg-border" />
          <PieSection
            title={previousMonthLabel}
            entries={previousEntries}
            isBreakdown={!!selectedType}
            onSliceClick={!selectedType ? handleSliceClick : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}
