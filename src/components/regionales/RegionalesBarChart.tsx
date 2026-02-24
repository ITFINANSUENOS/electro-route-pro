import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { TipoVentaFilter } from './TipoVentaFilter';
import type { RegionalData } from '@/hooks/useRegionalesData';

// Order: bottom (darkest) to top (lightest)
const TIPOS_VENTA = [
  { key: 'CONTADO', label: 'Contado', ventaColor: 'hsl(217, 91%, 30%)', metaColor: 'hsl(142, 76%, 28%)' },
  { key: 'CREDICONTADO', label: 'CrediContado', ventaColor: 'hsl(217, 85%, 42%)', metaColor: 'hsl(142, 68%, 38%)' },
  { key: 'CREDITO', label: 'Crédito', ventaColor: 'hsl(217, 78%, 56%)', metaColor: 'hsl(142, 60%, 50%)' },
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
      <p className="font-semibold mb-2">{entry?.fullName || label}</p>
      <p className="text-blue-600 font-medium">Ventas: {formatFullCurrency(totalVentas)}</p>
      <p className="text-green-600 font-medium">Meta: {formatFullCurrency(entry?.metaTotal || 0)}</p>
      <hr className="my-1.5 border-border/50" />
      {TIPOS_VENTA.slice().reverse().map(t => {
        const val = entry?.[t.key] || 0;
        if (val <= 0) return null;
        return (
          <p key={t.key} className="text-muted-foreground text-xs">
            {t.label}: {formatFullCurrency(val)}
          </p>
        );
      })}
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
      row[`meta_${t.key}`] = totalVentas > 0 && activeTipos.includes(t.key)
        ? (val / totalVentas) * r.meta
        : activeTipos.includes(t.key) ? r.meta / activeTipos.length : 0;
    });
    return row;
  });

  const activeItems = TIPOS_VENTA.filter(t => activeTipos.includes(t.key));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Ventas vs Meta por Regional
          </CardTitle>

          {/* Top legend: VENTA (blue) and META (green) */}
          <div className="flex items-center gap-4 mr-4">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(217, 85%, 42%)' }} />
              <span className="text-sm font-semibold">VENTA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(142, 68%, 38%)' }} />
              <span className="text-sm font-semibold">META</span>
            </div>
          </div>

          <TipoVentaFilter selected={tipoFilter} onChange={setTipoFilter} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                {/* Ventas stack: bottom (Contado/darkest) to top (Aliados/lightest) */}
                {activeItems.map((t, i) => (
                  <Bar
                    key={t.key}
                    dataKey={t.key}
                    stackId="ventas"
                    fill={t.ventaColor}
                    radius={i === activeItems.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    legendType="none"
                  />
                ))}
                {/* Metas stack: same order */}
                {activeItems.map((t, i) => (
                  <Bar
                    key={`meta_${t.key}`}
                    dataKey={`meta_${t.key}`}
                    stackId="metas"
                    fill={t.metaColor}
                    radius={i === activeItems.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    legendType="none"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Right legend: types from bottom (Contado) to top (Aliados) */}
          <div className="flex flex-col justify-center gap-2 pl-3 min-w-[120px]">
            {activeItems.slice().reverse().map(t => (
              <div key={t.key} className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: t.ventaColor }} />
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: t.metaColor }} />
                </div>
                <span className="text-muted-foreground">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
