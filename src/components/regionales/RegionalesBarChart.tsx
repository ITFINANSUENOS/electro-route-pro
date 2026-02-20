import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { TipoVentaFilter } from './TipoVentaFilter';
import type { RegionalData } from '@/hooks/useRegionalesData';

interface Props {
  data: RegionalData[];
}

function getBarColor(pct: number) {
  if (pct >= 100) return 'hsl(142, 71%, 45%)';
  if (pct >= 70) return 'hsl(45, 93%, 47%)';
  return 'hsl(0, 84%, 60%)';
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
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
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{entry?.fullName || label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.value)}
        </p>
      ))}
      {entry?.cantidadVentas != null && (
        <p className="text-muted-foreground mt-1">Cantidad: {entry.cantidadVentas}</p>
      )}
    </div>
  );
}

export function RegionalesBarChart({ data }: Props) {
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const filtered = filterByTipo(data, tipoFilter);

  const chartData = filtered.map(r => ({
    nombre: r.nombre.length > 12 ? r.nombre.substring(0, 12) + '…' : r.nombre,
    fullName: r.nombre,
    Ventas: r.ventaTotal,
    Meta: r.meta,
    cumplimiento: r.cumplimiento,
    cantidadVentas: r.cantidadVentas,
  }));

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
            <Bar dataKey="Ventas" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={getBarColor(entry.cumplimiento)} />
              ))}
            </Bar>
            <Bar dataKey="Meta" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
