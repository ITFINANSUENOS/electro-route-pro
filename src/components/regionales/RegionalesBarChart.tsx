import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { TipoVentaFilter } from './TipoVentaFilter';
import type { RegionalData } from '@/hooks/useRegionalesData';

const TIPOS_VENTA = [
  { key: 'CONTADO', label: 'Contado', ventaColor: 'hsl(217, 91%, 35%)', metaColor: 'hsl(142, 76%, 32%)' },
  { key: 'CREDICONTADO', label: 'CrediContado', ventaColor: 'hsl(217, 85%, 48%)', metaColor: 'hsl(142, 68%, 42%)' },
  { key: 'CREDITO', label: 'Crédito', ventaColor: 'hsl(217, 78%, 60%)', metaColor: 'hsl(142, 60%, 54%)' },
  { key: 'ALIADOS', label: 'Aliados', ventaColor: 'hsl(217, 70%, 72%)', metaColor: 'hsl(142, 52%, 66%)' },
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
      <p className="text-blue-600">Ventas: {formatFullCurrency(totalVentas)}</p>
      <p className="text-green-600">Meta: {formatFullCurrency(entry?.metaTotal || 0)}</p>
      <p className="text-muted-foreground mt-1">Cantidad: {entry?.cantidadVentas}</p>
    </div>
  );
}

export function RegionalesBarChart({ data }: Props) {
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const filtered = filterByTipo(data, tipoFilter);

  const activeTipos = tipoFilter.length > 0 ? tipoFilter : TIPOS_VENTA.map(t => t.key);

  const chartData = filtered.map(r => {
    const totalVentas = activeTipos.reduce((s, k) => s + (r.desglose[k]?.valor || 0), 0);
    const row: any = {
      nombre: r.nombre.length > 12 ? r.nombre.substring(0, 12) + '…' : r.nombre,
      fullName: r.nombre,
      metaTotal: r.meta,
      cantidadVentas: r.cantidadVentas,
    };
    TIPOS_VENTA.forEach(t => {
      const val = activeTipos.includes(t.key) ? (r.desglose[t.key]?.valor || 0) : 0;
      row[t.key] = val;
      // Distribute meta proportionally by tipo de venta
      row[`meta_${t.key}`] = totalVentas > 0 && activeTipos.includes(t.key)
        ? (val / totalVentas) * r.meta
        : activeTipos.includes(t.key) ? r.meta / activeTipos.length : 0;
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
            {TIPOS_VENTA.filter(t => activeTipos.includes(t.key)).map((t, i, arr) => (
              <Bar
                key={t.key}
                dataKey={t.key}
                name={`${t.label} (Venta)`}
                stackId="ventas"
                fill={t.ventaColor}
                radius={i === arr.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
            {TIPOS_VENTA.filter(t => activeTipos.includes(t.key)).map((t, i, arr) => (
              <Bar
                key={`meta_${t.key}`}
                dataKey={`meta_${t.key}`}
                name={`${t.label} (Meta)`}
                stackId="metas"
                fill={t.metaColor}
                radius={i === arr.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
