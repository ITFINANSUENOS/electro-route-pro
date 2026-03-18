import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Grid3X3 } from 'lucide-react';
import { formatCurrencyShort, formatCurrencyFull } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import type { HistoricoRegionalRow, MonthData } from '@/hooks/useHistoricoData';

interface Props {
  regionalRows: HistoricoRegionalRow[];
  availableMonths: string[];
  monthLabels: Record<string, string>;
}

function complianceColor(venta: number, meta: number): string {
  if (meta <= 0) return '';
  const pct = (venta / meta) * 100;
  if (pct >= 80) return 'bg-success/15 text-success';
  if (pct >= 60) return 'bg-warning/15 text-warning';
  return 'bg-danger/15 text-danger';
}

export function HistoricoRegionalGrid({ regionalRows, availableMonths, monthLabels }: Props) {
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  if (regionalRows.length === 0) return null;

  // Calculate totals per month
  const monthTotals: Record<string, { venta: number; meta: number }> = {};
  availableMonths.forEach(mk => {
    monthTotals[mk] = { venta: 0, meta: 0 };
    regionalRows.forEach(r => {
      const d = r.months[mk];
      if (d) {
        monthTotals[mk].venta += d.venta;
        monthTotals[mk].meta += d.meta;
      }
    });
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Grid3X3 className="h-5 w-5 text-primary" />
          Evolución por Regional
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[140px]">Regional</TableHead>
              {availableMonths.map(mk => (
                <TableHead key={mk} className="text-center min-w-[100px]">{monthLabels[mk]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {regionalRows.map(r => (
              <>
                <TableRow key={r.id}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">{r.nombre}</TableCell>
                  {availableMonths.map(mk => {
                    const d = r.months[mk];
                    const venta = d?.venta || 0;
                    const meta = d?.meta || 0;
                    const cellKey = `${r.id}-${mk}`;
                    const isExpanded = expandedCell === cellKey;
                    return (
                      <TableCell
                        key={mk}
                        className={cn(
                          'text-center text-xs font-medium cursor-pointer transition-colors p-2',
                          complianceColor(venta, meta),
                          !d && 'text-muted-foreground'
                        )}
                        onClick={() => setExpandedCell(isExpanded ? null : cellKey)}
                      >
                        {venta !== 0 ? formatCurrencyShort(venta) : '—'}
                        {meta > 0 && (
                          <div className="text-[10px] opacity-70">
                            {((venta / meta) * 100).toFixed(0)}%
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                {expandedCell?.startsWith(r.id) && (() => {
                  const mk = expandedCell.split('-').slice(1).join('-');
                  const d = r.months[mk];
                  if (!d) return null;
                  return (
                    <TableRow key={`${r.id}-detail`} className="bg-muted/30">
                      <TableCell className="sticky left-0 bg-muted/30 z-10 text-xs text-muted-foreground pl-6" colSpan={1}>
                        Desglose {monthLabels[mk]}
                      </TableCell>
                      <TableCell colSpan={availableMonths.length} className="text-xs">
                        <div className="flex gap-4 flex-wrap">
                          {['CONTADO', 'FINANSUENOS', 'ALIADOS'].map(tipo => {
                            const tv = d.desglose[tipo];
                            if (!tv) return null;
                            return (
                              <span key={tipo} className="text-muted-foreground">
                                <span className="font-medium">{tipo === 'FINANSUENOS' ? 'FinanSueños' : tipo === 'CONTADO' ? 'Contado' : 'Aliados'}</span>: {formatCurrencyFull(tv.valor)} ({tv.cantidad.toLocaleString('es-CO')})
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })()}
              </>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-bold">
              <TableCell className="sticky left-0 bg-muted/50 z-10">TOTAL</TableCell>
              {availableMonths.map(mk => (
                <TableCell key={mk} className="text-center text-xs">
                  {formatCurrencyShort(monthTotals[mk].venta)}
                  {monthTotals[mk].meta > 0 && (
                    <div className="text-[10px] opacity-70">
                      {((monthTotals[mk].venta / monthTotals[mk].meta) * 100).toFixed(0)}%
                    </div>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
