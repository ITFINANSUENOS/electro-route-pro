import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Hash } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { MonthData } from '@/hooks/useHistoricoData';

const TIPOS = [
  { key: 'CONTADO', label: 'Contado', color: 'hsl(217, 91%, 30%)' },
  { key: 'FINANSUENOS', label: 'FinanSueños', color: 'hsl(217, 82%, 48%)' },
  { key: 'ALIADOS', label: 'Aliados', color: 'hsl(217, 70%, 72%)' },
];

interface Props {
  months: MonthData[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-xs">
          {p.name}: {Number(p.value).toLocaleString('es-CO')}
        </p>
      ))}
    </div>
  );
}

export function HistoricoCantidadChart({ months }: Props) {
  const [showByType, setShowByType] = useState(false);

  const chartData = months.map(m => {
    const row: any = { label: m.label, Total: m.cantidad };
    TIPOS.forEach(t => {
      row[t.label] = m.desglose[t.key]?.cantidad || 0;
    });
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-5 w-5 text-primary" />
            Evolución Cantidad de Ventas (Q)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="byType" className="text-xs text-muted-foreground">Por tipo</Label>
            <Switch id="byType" checked={showByType} onCheckedChange={setShowByType} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('es-CO')} />
            <Tooltip content={<CustomTooltip />} />
            {showByType ? (
              TIPOS.map(t => (
                <Line key={t.key} type="monotone" dataKey={t.label} stroke={t.color}
                  strokeWidth={2} dot={{ r: 4 }} name={t.label} />
              ))
            ) : (
              <Line type="monotone" dataKey="Total" stroke="hsl(243, 81%, 38%)"
                strokeWidth={2.5} dot={{ r: 5 }} name="Total" />
            )}
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
