import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RegionalData } from '@/hooks/useRegionalesData';

interface Props {
  data: RegionalData[];
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

export function RegionalesTipoVentaTable({ data }: Props) {
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
                  <> 
                    <TableHead key={`${t}-v`} className="text-right text-xs border-l">$</TableHead>
                    <TableHead key={`${t}-q`} className="text-right text-xs">Q</TableHead>
                  </>
                ))}
                <TableHead className="text-right text-xs border-l">$</TableHead>
                <TableHead className="text-right text-xs">Q</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(r => {
                let totalVal = 0;
                let totalQ = 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium whitespace-nowrap">{r.nombre}</TableCell>
                    {TIPOS.map(t => {
                      const d = r.desglose[t] || { valor: 0, cantidad: 0 };
                      totalVal += d.valor;
                      totalQ += d.cantidad;
                      return (
                        <>
                          <TableCell key={`${t}-v`} className="text-right text-xs border-l">{formatCurrency(d.valor)}</TableCell>
                          <TableCell key={`${t}-q`} className="text-right text-xs">{d.cantidad}</TableCell>
                        </>
                      );
                    })}
                    <TableCell className="text-right text-xs font-semibold border-l">{formatCurrency(totalVal)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{totalQ}</TableCell>
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
