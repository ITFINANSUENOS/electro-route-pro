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
                <TableHead rowSpan={2} className="sticky left-0 bg-card z-10 align-middle border-b">Regional</TableHead>
                {TIPOS.map(t => (
                  <TableHead key={t} colSpan={2} className="text-center border-l border-b-0 pb-1">
                    {TIPO_LABELS[t] || t}
                  </TableHead>
                ))}
                <TableHead rowSpan={2} className="text-right border-l font-bold align-middle border-b">Total</TableHead>
              </TableRow>
              <TableRow>
                {TIPOS.map(t => (
                  <>
                    <TableHead key={`${t}-v`} className="text-right text-xs border-l text-muted-foreground py-1">Ventas $</TableHead>
                    <TableHead key={`${t}-p`} className="text-right text-xs text-muted-foreground py-1">Cump %</TableHead>
                  </>
                ))}
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
                        <>
                          <TableCell key={`${r.id}-${t}-v`} className="text-right text-xs border-l">{formatCurrency(d.valor)}</TableCell>
                          <TableCell key={`${r.id}-${t}-p`} className={cn('text-right text-xs font-semibold', getComplianceColor(pct))}>
                            {pct.toFixed(1)}%
                          </TableCell>
                        </>
                      );
                    })}
                    <TableCell className="text-right text-xs font-semibold border-l">{formatCurrency(totalVal)}</TableCell>
                  </TableRow>
                );
              })}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={TIPOS.length * 2 + 2} className="text-center py-8 text-muted-foreground">
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
