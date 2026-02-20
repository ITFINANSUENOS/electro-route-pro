import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { RegionalData } from '@/hooks/useRegionalesData';

interface Props {
  data: RegionalData[];
  metaType: 'comercial' | 'nacional';
}

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

export function RegionalesRankingTable({ data, metaType }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Ranking por Cumplimiento — Meta {metaType === 'comercial' ? 'Comercial' : 'Nacional'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Regional</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="w-40">Cumplimiento</TableHead>
              <TableHead className="text-right">Q</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r, idx) => (
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
            {data.length === 0 && (
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
