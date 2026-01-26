import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { TipoVentaKey, tiposVentaLabels } from './RankingTable';

interface SalesByPaymentMethod {
  codigo: string;
  nombre: string;
  tipo_venta: string;
  cantidad: number;
  total: number;
}

interface PaymentBreakdownProps {
  salesData: Array<{
    forma1_pago?: string | null;
    tipo_venta?: string | null;
    vtas_ant_i: number;
  }>;
  formasPago: Array<{
    codigo: string;
    nombre: string;
    tipo_venta: string;
    activo: boolean;
  }>;
  selectedFilters: TipoVentaKey[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyCompact = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const tipoVentaColors: Record<string, string> = {
  CONTADO: 'bg-success/10 text-success border-success/30',
  CREDICONTADO: 'bg-warning/10 text-warning border-warning/30',
  CREDITO: 'bg-primary/10 text-primary border-primary/30',
  CONVENIO: 'bg-secondary/10 text-secondary border-secondary/30',
};

export function PaymentBreakdown({
  salesData,
  formasPago,
  selectedFilters,
}: PaymentBreakdownProps) {
  // Calculate sales breakdown by payment method
  const breakdown = useMemo(() => {
    if (!salesData || !formasPago) return [];

    // Create a lookup map for payment method names
    const paymentNameMap = new Map<string, { nombre: string; tipo_venta: string }>();
    formasPago.forEach(fp => {
      // Normalize both keys (with special chars like ñ/�)
      paymentNameMap.set(fp.codigo.toUpperCase(), { nombre: fp.nombre, tipo_venta: fp.tipo_venta });
      // Also add with common replacements for encoding issues
      const normalizedCodigo = fp.codigo.toUpperCase().replace(/Ñ/g, '�');
      paymentNameMap.set(normalizedCodigo, { nombre: fp.nombre, tipo_venta: fp.tipo_venta });
    });

    // Filter sales by selected types (if any)
    const filteredSales = selectedFilters.length > 0
      ? salesData.filter(s => s.tipo_venta && selectedFilters.includes(s.tipo_venta as TipoVentaKey))
      : salesData.filter(s => s.tipo_venta && s.tipo_venta !== 'OTROS');

    // Group by payment method
    const groupedByPayment = filteredSales.reduce((acc, sale) => {
      const formaPago = (sale.forma1_pago || 'DESCONOCIDO').toUpperCase();
      const tipoVenta = sale.tipo_venta || 'OTRO';
      const key = `${tipoVenta}|${formaPago}`;
      
      if (!acc[key]) {
        // Try to find the display name from formas_pago
        let displayName = formaPago;
        let tipo = tipoVenta;
        
        const fpInfo = paymentNameMap.get(formaPago);
        if (fpInfo) {
          displayName = fpInfo.nombre;
          tipo = fpInfo.tipo_venta;
        }
        
        acc[key] = {
          codigo: formaPago,
          nombre: displayName,
          tipo_venta: tipo,
          cantidad: 0,
          total: 0,
        };
      }
      
      acc[key].cantidad += 1;
      acc[key].total += sale.vtas_ant_i || 0;
      
      return acc;
    }, {} as Record<string, SalesByPaymentMethod>);

    // Convert to array and sort by tipo_venta then by total
    return Object.values(groupedByPayment)
      .sort((a, b) => {
        // First sort by tipo_venta
        const tipoOrder = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO'];
        const tipoA = tipoOrder.indexOf(a.tipo_venta);
        const tipoB = tipoOrder.indexOf(b.tipo_venta);
        if (tipoA !== tipoB) return tipoA - tipoB;
        // Then by total descending
        return b.total - a.total;
      });
  }, [salesData, formasPago, selectedFilters]);

  // Group by tipo_venta for display sections
  const groupedByTipo = useMemo(() => {
    const groups: Record<string, SalesByPaymentMethod[]> = {};
    breakdown.forEach(item => {
      if (!groups[item.tipo_venta]) {
        groups[item.tipo_venta] = [];
      }
      groups[item.tipo_venta].push(item);
    });
    return groups;
  }, [breakdown]);

  // Calculate totals per tipo
  const tipoTotals = useMemo(() => {
    const totals: Record<string, { cantidad: number; total: number }> = {};
    breakdown.forEach(item => {
      if (!totals[item.tipo_venta]) {
        totals[item.tipo_venta] = { cantidad: 0, total: 0 };
      }
      totals[item.tipo_venta].cantidad += item.cantidad;
      totals[item.tipo_venta].total += item.total;
    });
    return totals;
  }, [breakdown]);

  // Get the active filter types to display
  const displayTipos = selectedFilters.length > 0 
    ? selectedFilters 
    : (['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO'] as TipoVentaKey[]);

  if (breakdown.length === 0) {
    return null;
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Desglose por Forma de Pago
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Detalle de ventas según la clasificación de formas de pago
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayTipos.map(tipo => {
          const items = groupedByTipo[tipo] || [];
          const totals = tipoTotals[tipo] || { cantidad: 0, total: 0 };
          
          if (items.length === 0) return null;
          
          return (
            <div key={tipo} className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={`${tipoVentaColors[tipo] || 'bg-muted'} font-medium`}
                >
                  {tiposVentaLabels[tipo] || tipo}
                </Badge>
                <div className="text-right">
                  <span className="font-semibold text-sm">
                    <span className="hidden sm:inline">{formatCurrency(totals.total)}</span>
                    <span className="sm:hidden">{formatCurrencyCompact(totals.total)}</span>
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({totals.cantidad} ventas)
                  </span>
                </div>
              </div>
              
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.nombre}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {item.cantidad} {item.cantidad === 1 ? 'venta' : 'ventas'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-xs sm:text-sm">
                        <span className="hidden sm:inline">{formatCurrency(item.total)}</span>
                        <span className="sm:hidden">{formatCurrencyCompact(item.total)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
