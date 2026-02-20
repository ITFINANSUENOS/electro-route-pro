import { useState } from 'react';
import { Trophy, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TipoVentaFilter } from './TipoVentaFilter';
import type { RegionalData } from '@/hooks/useRegionalesData';

interface Props {
  data: RegionalData[];
  metaType: 'comercial' | 'nacional';
}

type SortKey = 'cumplimiento' | 'ventaTotal' | 'meta' | 'cantidadVentas';

function formatCurrency(value: number) {
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

const TIPOS_ALL = ['CONTADO', 'FINANSUEÑOS', 'CONVENIO', 'CREDICONTADO'];

function filterByTipo(data: RegionalData[], tipos: string[]): RegionalData[] {
  if (tipos.length === 0) return data; // all
  return data.map(r => {
    let ventaTotal = 0;
    let cantidadVentas = 0;
    tipos.forEach(t => {
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

export function RegionalesRankingTable({ data, metaType }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('cumplimiento');
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);

  const filtered = filterByTipo(data, tipoFilter);
  const sorted = [...filtered].sort((a, b) => b[sortKey] - a[sortKey]);

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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking por Cumplimiento — Meta {metaType === 'comercial' ? 'Comercial' : 'Nacional'}
          </CardTitle>
          <TipoVentaFilter selected={tipoFilter} onChange={setTipoFilter} />
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Regional</TableHead>
              <TableHead className="text-right"><SortButton col="ventaTotal" label="Ventas" /></TableHead>
              <TableHead className="text-right"><SortButton col="meta" label="Meta" /></TableHead>
              <TableHead className="w-40"><SortButton col="cumplimiento" label="Cumplimiento" /></TableHead>
              <TableHead className="text-right"><SortButton col="cantidadVentas" label="Q" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r, idx) => (
              <TableRow key={r.id}>
                <TableCell className="text-center font-bold">{idx + 1}</TableCell>
                <TableCell className="font-medium">{r.nombre}</TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(r.ventaTotal)}</TableCell>
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
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
