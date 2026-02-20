import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { RegionalData } from '@/hooks/useRegionalesData';

interface Props {
  data: RegionalData[];
  metaNacionalByRegional: Record<string, number>;
}

const TIPOS = ['CONTADO', 'FINANSUEÑOS', 'CONVENIO', 'CREDICONTADO'];
const TIPO_LABELS: Record<string, string> = {
  CONTADO: 'Contado',
  FINANSUEÑOS: 'Crédito',
  CONVENIO: 'Aliados',
  CREDICONTADO: 'CrediContado',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function getComplianceColor(pct: number) {
  if (pct >= 100) return 'text-green-600';
  if (pct >= 70) return 'text-yellow-600';
  return 'text-destructive';
}

export function RegionalesTipoVentaTable({ data, metaNacionalByRegional }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-5 w-5 text-secondary" />
          Desglose por Tipo de Venta
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10">Regional</TableHead>
                {TIPOS.map(t => (
                  <TableHead key={t} colSpan={2} className="text-center border-l">
                    {TIPO_LABELS[t] || t}
                  </TableHead>
                ))}
                <TableHead colSpan={2} className="text-center border-l font-bold">Total</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10" />
                {TIPOS.map(t => (
                  <TableHead key={`${t}-sub`} colSpan={2} className="text-center border-l">
                    <div className="flex">
                      <span className="flex-1 text-right text-xs">$</span>
                      <span className="flex-1 text-right text-xs">% Nac.</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center border-l" colSpan={2}>
                  <div className="flex">
                    <span className="flex-1 text-right text-xs">$</span>
                    <span className="flex-1 text-right text-xs">% Nac.</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(r => {
                let totalVal = 0;
                const metaNac = metaNacionalByRegional[r.id] || 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium whitespace-nowrap">{r.nombre}</TableCell>
                    {TIPOS.map(t => {
                      const d = r.desglose[t] || { valor: 0, cantidad: 0 };
                      totalVal += d.valor;
                      const pct = metaNac > 0 ? (d.valor / metaNac) * 100 : 0;
                      return (
                        <TableCell key={`${r.id}-${t}`} colSpan={2} className="border-l p-0">
                          <div className="flex">
                            <span className="flex-1 text-right text-xs px-2 py-2">{formatCurrency(d.valor)}</span>
                            <span className={cn('flex-1 text-right text-xs px-2 py-2 font-semibold', getComplianceColor(pct))}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell colSpan={2} className="border-l p-0">
                      {(() => {
                        const totalPct = metaNac > 0 ? (totalVal / metaNac) * 100 : 0;
                        return (
                          <div className="flex">
                            <span className="flex-1 text-right text-xs font-semibold px-2 py-2">{formatCurrency(totalVal)}</span>
                            <span className={cn('flex-1 text-right text-xs font-semibold px-2 py-2', getComplianceColor(totalPct))}>
                              {totalPct.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={TIPOS.length * 2 + 3} className="text-center py-8 text-muted-foreground">
                    No hay datos disponibles
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
