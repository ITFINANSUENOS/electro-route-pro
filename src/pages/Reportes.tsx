import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  Users,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KpiCard } from '@/components/ui/kpi-card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const monthlyData = [
  { name: 'Ene', ventas: 45000000, meta: 50000000 },
  { name: 'Feb', ventas: 48000000, meta: 50000000 },
  { name: 'Mar', ventas: 52000000, meta: 55000000 },
  { name: 'Abr', ventas: 49000000, meta: 55000000 },
  { name: 'May', ventas: 58000000, meta: 60000000 },
  { name: 'Jun', ventas: 62000000, meta: 60000000 },
];

const zoneData = [
  { name: 'Norte', value: 35, color: 'hsl(var(--primary))' },
  { name: 'Sur', value: 28, color: 'hsl(var(--secondary))' },
  { name: 'Centro', value: 22, color: 'hsl(var(--success))' },
  { name: 'Oriente', value: 15, color: 'hsl(var(--warning))' },
];

const advisorPerformance = [
  { name: 'María López', ventas: 12500000, meta: 10000000, cumplimiento: 125 },
  { name: 'Carlos Ruiz', ventas: 9800000, meta: 10000000, cumplimiento: 98 },
  { name: 'Ana Martínez', ventas: 8500000, meta: 10000000, cumplimiento: 85 },
  { name: 'Pedro Santos', ventas: 7200000, meta: 10000000, cumplimiento: 72 },
  { name: 'Laura Gómez', ventas: 6800000, meta: 10000000, cumplimiento: 68 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function Reportes() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes y Análisis</h1>
          <p className="text-muted-foreground mt-1">
            Visualiza el rendimiento comercial con métricas detalladas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button className="btn-brand">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Período:</span>
              <Select defaultValue="month">
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="quarter">Este trimestre</SelectItem>
                  <SelectItem value="year">Este año</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Zona:</span>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="norte">Norte</SelectItem>
                  <SelectItem value="sur">Sur</SelectItem>
                  <SelectItem value="centro">Centro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas Totales"
          value={formatCurrency(314000000)}
          subtitle="Año actual"
          icon={ShoppingCart}
          trend={{ value: 15.2, label: 'vs año anterior' }}
          status="success"
        />
        <KpiCard
          title="Cumplimiento Global"
          value="89%"
          subtitle="Promedio general"
          icon={TrendingUp}
          status="success"
        />
        <KpiCard
          title="Asesores Activos"
          value="24"
          subtitle="De 26 totales"
          icon={Users}
        />
        <KpiCard
          title="Promedio Mensual"
          value={formatCurrency(52300000)}
          subtitle="Por mes"
          icon={BarChart3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Tendencia de Ventas vs Meta</CardTitle>
            <CardDescription>Comparativo mensual del semestre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Line
                    type="monotone"
                    dataKey="ventas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    name="Ventas"
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="meta"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Meta"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Zone Distribution */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Distribución por Zona</CardTitle>
            <CardDescription>Participación en ventas totales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={zoneData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {zoneData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Participación']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {zoneData.map((zone) => (
                  <div key={zone.name} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="text-sm text-foreground">{zone.name}</span>
                    <span className="text-sm font-semibold text-foreground ml-auto">
                      {zone.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Ranking de Asesores</CardTitle>
          <CardDescription>Top 5 por cumplimiento de meta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pos.</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Asesor</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ventas</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Meta</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Cumplimiento</th>
                </tr>
              </thead>
              <tbody>
                {advisorPerformance.map((advisor, index) => (
                  <tr key={advisor.name} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium">{advisor.name}</td>
                    <td className="py-4 px-4 text-right">{formatCurrency(advisor.ventas)}</td>
                    <td className="py-4 px-4 text-right text-muted-foreground">{formatCurrency(advisor.meta)}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        advisor.cumplimiento >= 100 ? 'bg-success/10 text-success' :
                        advisor.cumplimiento >= 80 ? 'bg-warning/10 text-warning' :
                        'bg-danger/10 text-danger'
                      }`}>
                        {advisor.cumplimiento}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
