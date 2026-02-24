import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { TipoVentaFilter } from './TipoVentaFilter';
import type { RegionalData } from '@/hooks/useRegionalesData';

const TIPOS_VENTA = [
  { key: 'CONTADO', label: 'Contado', color: 'hsl(142, 76%, 42%)' },
  { key: 'CREDICONTADO', label: 'CrediContado', color: 'hsl(38, 92%, 50%)' },
  { key: 'CREDITO', label: 'Crédito', color: 'hsl(217, 91%, 50%)' },
  { key: 'ALIADOS', label: 'Aliados', color: 'hsl(187, 85%, 43%)' },
];

interface Props {
  data: RegionalData[];
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatFullCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

function filterByTipo(data: RegionalData[], tipos: string[]) {
  if (tipos.length === 0) return data;
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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  const totalVentas = TIPOS_VENTA.reduce((sum, t) => sum + (entry?.[t.key] || 0), 0);
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{entry?.fullName || label}</p>
      <p>Ventas: {formatFullCurrency(totalVentas)}</p>
      <p>Meta: {formatFullCurrency(entry?.Meta || 0)}</p>
      <p className="text-muted-foreground mt-1">Cantidad: {entry?.cantidadVentas}</p>
    </div>
  );
}

export function RegionalesBarChart({ data }: Props) {
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const filtered = filterByTipo(data, tipoFilter);

  const activeTipos = tipoFilter.length > 0 ? tipoFilter : TIPOS_VENTA.map(t => t.key);

  const chartData = filtered.map(r => {
    const row: any = {
      nombre: r.nombre.length > 12 ? r.nombre.substring(0, 12) + '…' : r.nombre,
      fullName: r.nombre,
      Meta: r.meta,
      cantidadVentas: r.cantidadVentas,
    };
    TIPOS_VENTA.forEach(t => {
      row[t.key] = activeTipos.includes(t.key) ? (r.desglose[t.key]?.valor || 0) : 0;
    });
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Ventas vs Meta por Regional
          </CardTitle>
          <TipoVentaFilter selected={tipoFilter} onChange={setTipoFilter} />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {TIPOS_VENTA.filter(t => activeTipos.includes(t.key)).map((t, i) => (
              <Bar
                key={t.key}
                dataKey={t.key}
                name={t.label}
                stackId="ventas"
                fill={t.color}
                radius={i === TIPOS_VENTA.filter(tv => activeTipos.includes(tv.key)).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
            <Bar dataKey="Meta" name="Meta" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
