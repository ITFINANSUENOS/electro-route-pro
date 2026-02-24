import { useState } from 'react';
import { Trophy, ArrowUpDown, Filter, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RegionalData } from '@/hooks/useRegionalesData';

interface Props {
  data: RegionalData[];
  metaType: 'comercial' | 'nacional';
}

type SortKey = 'cumplimiento' | 'ventaTotal' | 'meta' | 'cantidadVentas' | 'contado' | 'credicontado' | 'credito' | 'aliados';

const TIPOS_VENTA = [
  { value: 'CONTADO', label: 'Contado', shortLabel: 'Contado' },
  { value: 'CREDICONTADO', label: 'Credi Contado', shortLabel: 'C. Contado' },
  { value: 'CREDITO', label: 'Crédito', shortLabel: 'Crédito' },
  { value: 'ALIADOS', label: 'Aliados', shortLabel: 'Aliados' },
];

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function getComplianceColor(pct: number) {
  if (pct >= 100) return 'text-green-600';
  if (pct >= 70) return 'text-yellow-600';
  return 'text-destructive';
}

function getProgressColor(pct: number) {
  if (pct >= 100) return '[&>div]:bg-green-500';
  if (pct >= 70) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-destructive';
}

function getTypeValue(r: RegionalData, tipo: string): number {
  return r.desglose[tipo]?.valor || 0;
}

function computeFiltered(data: RegionalData[], activeTypes: string[]): RegionalData[] {
  return data.map(r => {
    let ventaTotal = 0;
    let cantidadVentas = 0;
    activeTypes.forEach(t => {
      const d = r.desglose[t];
      if (d) {
        ventaTotal += d.valor;
        cantidadVentas += d.cantidad;
      }
    });
    const cumplimiento = r.meta > 0 ? (ventaTotal / r.meta) * 100 : 0;
    return { ...r, ventaTotal, cantidadVentas, cumplimiento };
  });
}

function getSortValue(r: RegionalData, key: SortKey): number {
  switch (key) {
    case 'contado': return getTypeValue(r, 'CONTADO');
    case 'credicontado': return getTypeValue(r, 'CREDICONTADO');
    case 'credito': return getTypeValue(r, 'CREDITO');
    case 'aliados': return getTypeValue(r, 'ALIADOS');
    default: return r[key];
  }
}

export function RegionalesRankingTable({ data, metaType }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('cumplimiento');
  // All types active by default
  const [activeTypes, setActiveTypes] = useState<string[]>(TIPOS_VENTA.map(t => t.value));

  const allActive = activeTypes.length === TIPOS_VENTA.length;

  const toggleType = (value: string) => {
    if (activeTypes.includes(value)) {
      const next = activeTypes.filter(v => v !== value);
      // Don't allow deselecting all
      if (next.length === 0) return;
      setActiveTypes(next);
    } else {
      const next = [...activeTypes, value];
      setActiveTypes(next);
    }
  };

  const selectAll = () => setActiveTypes(TIPOS_VENTA.map(t => t.value));

  const filtered = computeFiltered(data, activeTypes);
  const sorted = [...filtered].sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));

  const SortButton = ({ col, label }: { col: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-auto p-0 font-medium text-xs hover:bg-transparent', sortKey === col && 'text-primary')}
      onClick={() => setSortKey(col)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 ml-1" />
    </Button>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking por Cumplimiento — Meta {metaType === 'comercial' ? 'Comercial' : 'Nacional'}
          </CardTitle>
          {/* Inline checkbox filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
            </div>
            {TIPOS_VENTA.map(t => {
              const isActive = activeTypes.includes(t.value);
              return (
                <button
                  key={t.value}
                  onClick={() => toggleType(t.value)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors border',
                    isActive
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted/50 border-transparent text-muted-foreground line-through'
                  )}
                >
                  <Check className={cn('h-3 w-3', isActive ? 'opacity-100' : 'opacity-0')} />
                  {t.label}
                </button>
              );
            })}
            {!allActive && (
              <button
                onClick={selectAll}
                className="text-xs text-primary hover:underline ml-1"
              >
                Todos
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead>Regional</TableHead>
              {TIPOS_VENTA.filter(t => activeTypes.includes(t.value)).map(t => (
                <TableHead key={t.value} className="text-right">
                  <SortButton col={t.value.toLowerCase() as SortKey} label={t.shortLabel} />
                </TableHead>
              ))}
              <TableHead className="text-right"><SortButton col="ventaTotal" label="Ventas" /></TableHead>
              <TableHead className="text-right"><SortButton col="meta" label="Meta" /></TableHead>
              <TableHead className="w-36"><SortButton col="cumplimiento" label="Cumplimiento" /></TableHead>
              <TableHead className="text-right"><SortButton col="cantidadVentas" label="Q" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r, idx) => (
              <TableRow key={r.id}>
                <TableCell className="text-center font-bold">{idx + 1}</TableCell>
                <TableCell className="font-medium">{r.nombre}</TableCell>
                {TIPOS_VENTA.filter(t => activeTypes.includes(t.value)).map(t => (
                  <TableCell key={t.value} className="text-right text-sm text-muted-foreground">
                    {formatCurrency(getTypeValue(r, t.value))}
                  </TableCell>
                ))}
                <TableCell className="text-right text-sm font-medium">{formatCurrency(r.ventaTotal)}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.meta)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(r.cumplimiento, 100)} className={cn('h-2 flex-1', getProgressColor(r.cumplimiento))} />
                    <span className={cn('text-xs font-semibold w-12 text-right', getComplianceColor(r.cumplimiento))}>
                      {r.cumplimiento.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{r.cantidadVentas}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={8 + activeTypes.length} className="text-center py-8 text-muted-foreground">
                  No hay datos disponibles
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
