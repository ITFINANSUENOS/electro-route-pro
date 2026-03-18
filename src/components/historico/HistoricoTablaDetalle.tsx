import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { TableIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { formatCurrencyFull } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import type { MonthData } from '@/hooks/useHistoricoData';

interface Props {
  months: MonthData[];
}

function VariationCell({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = pct > 0;
  const isNeutral = Math.abs(pct) < 0.5;
  return (
    <span className={cn('text-xs font-medium flex items-center gap-0.5',
      isNeutral ? 'text-muted-foreground' : isPositive ? 'text-success' : 'text-danger'
    )}>
      {isNeutral ? <Minus className="h-3 w-3" /> : isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function CumplimientoCell({ value }: { value: number }) {
  return (
    <span className={cn('text-xs font-semibold',
      value >= 80 ? 'text-success' : value >= 60 ? 'text-warning' : 'text-danger'
    )}>
      {value.toFixed(1)}%
    </span>
  );
}

export function HistoricoTablaDetalle({ months }: Props) {
  const totals = {
    ventaTotal: months.reduce((s, m) => s + m.ventaTotal, 0),
    contado: months.reduce((s, m) => s + (m.desglose['CONTADO']?.valor || 0), 0),
    finansuenos: months.reduce((s, m) => s + (m.desglose['FINANSUENOS']?.valor || 0), 0),
    aliados: months.reduce((s, m) => s + (m.desglose['ALIADOS']?.valor || 0), 0),
    cantidad: months.reduce((s, m) => s + m.cantidad, 0),
    meta: months.reduce((s, m) => s + m.meta, 0),
  };
  const totalCumplimiento = totals.meta > 0 ? (totals.ventaTotal / totals.meta) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TableIcon className="h-5 w-5 text-primary" />
          Detalle Mensual
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">Mes</TableHead>
              <TableHead className="text-right">Total ($)</TableHead>
              <TableHead className="text-right">Contado</TableHead>
              <TableHead className="text-right">FinanSueños</TableHead>
              <TableHead className="text-right">Aliados</TableHead>
              <TableHead className="text-right">Q</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">Cumpl. %</TableHead>
              <TableHead className="text-right">Var. %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((m, i) => (
              <TableRow key={m.key}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium">{m.label}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrencyFull(m.ventaTotal)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrencyFull(m.desglose['CONTADO']?.valor || 0)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrencyFull(m.desglose['FINANSUENOS']?.valor || 0)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrencyFull(m.desglose['ALIADOS']?.valor || 0)}</TableCell>
                <TableCell className="text-right">{m.cantidad.toLocaleString('es-CO')}</TableCell>
                <TableCell className="text-right">{formatCurrencyFull(m.meta)}</TableCell>
                <TableCell className="text-right"><CumplimientoCell value={m.cumplimiento} /></TableCell>
                <TableCell className="text-right">
                  {i > 0 ? <VariationCell current={m.ventaTotal} previous={months[i - 1].ventaTotal} /> : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-bold">
              <TableCell className="sticky left-0 bg-muted/50 z-10">TOTAL</TableCell>
              <TableCell className="text-right">{formatCurrencyFull(totals.ventaTotal)}</TableCell>
              <TableCell className="text-right">{formatCurrencyFull(totals.contado)}</TableCell>
              <TableCell className="text-right">{formatCurrencyFull(totals.finansuenos)}</TableCell>
              <TableCell className="text-right">{formatCurrencyFull(totals.aliados)}</TableCell>
              <TableCell className="text-right">{totals.cantidad.toLocaleString('es-CO')}</TableCell>
              <TableCell className="text-right">{formatCurrencyFull(totals.meta)}</TableCell>
              <TableCell className="text-right"><CumplimientoCell value={totalCumplimiento} /></TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
