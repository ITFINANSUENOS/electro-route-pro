import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Target,
  CalendarCheck,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge, TrafficLight } from '@/components/ui/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/types/auth';
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
} from 'recharts';

// Mock data for charts
const salesData = [
  { name: 'Ene', ventas: 4000, meta: 4500 },
  { name: 'Feb', ventas: 3000, meta: 4500 },
  { name: 'Mar', ventas: 5000, meta: 4500 },
  { name: 'Abr', ventas: 4780, meta: 4500 },
  { name: 'May', ventas: 5890, meta: 5000 },
  { name: 'Jun', ventas: 4390, meta: 5000 },
];

const teamPerformance = [
  { name: 'Juan P.', cumplimiento: 95 },
  { name: 'María L.', cumplimiento: 88 },
  { name: 'Carlos R.', cumplimiento: 72 },
  { name: 'Ana M.', cumplimiento: 65 },
  { name: 'Pedro S.', cumplimiento: 45 },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { profile, role } = useAuth();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            ¡Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {role && roleLabels[role]} • Hoy es {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Estado general:</span>
          <TrafficLight status="success" />
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas del Mes"
          value="$24.5M"
          subtitle="Meta: $30M"
          icon={ShoppingCart}
          trend={{ value: 12.5, label: 'vs mes anterior' }}
          status="success"
        />
        <KpiCard
          title="Cumplimiento"
          value="82%"
          subtitle="18% para meta"
          icon={Target}
          trend={{ value: 5.2, label: 'vs semana anterior' }}
          status="warning"
        />
        <KpiCard
          title="Solicitudes"
          value="156"
          subtitle="Este mes"
          icon={Users}
          trend={{ value: -3.1, label: 'vs mes anterior' }}
        />
        <KpiCard
          title="Actividades Hoy"
          value="8"
          subtitle="3 pendientes"
          icon={CalendarCheck}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* Sales Chart */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              Ventas vs Meta
            </CardTitle>
            <CardDescription>Comparativo mensual del año</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ventas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="meta"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Rendimiento del Equipo
            </CardTitle>
            <CardDescription>Top 5 asesores por cumplimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} className="text-xs" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Cumplimiento']}
                  />
                  <Bar
                    dataKey="cumplimiento"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts and Activity */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimos movimientos del equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { user: 'María López', action: 'registró actividad en Popayán', time: 'Hace 15 min', type: 'activity' },
                { user: 'Carlos Ruiz', action: 'completó venta por $2.5M', time: 'Hace 1 hora', type: 'sale' },
                { user: 'Ana Martínez', action: 'actualizó programación semanal', time: 'Hace 2 horas', type: 'schedule' },
                { user: 'Pedro Santos', action: 'sin registro de actividad', time: '2 días', type: 'alert' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    activity.type === 'alert' ? 'bg-danger/10' : 'bg-accent'
                  }`}>
                    {activity.type === 'alert' ? (
                      <AlertCircle className="h-5 w-5 text-danger" />
                    ) : activity.type === 'sale' ? (
                      <ArrowUpRight className="h-5 w-5 text-success" />
                    ) : (
                      <CalendarCheck className="h-5 w-5 text-accent-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      <span className="font-semibold">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status="danger" label="Crítico" size="sm" />
                </div>
                <p className="text-sm text-foreground font-medium">3 asesores sin actividad</p>
                <p className="text-xs text-muted-foreground mt-1">Hace más de 2 días</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status="warning" label="Atención" size="sm" />
                </div>
                <p className="text-sm text-foreground font-medium">Zona Norte bajo meta</p>
                <p className="text-xs text-muted-foreground mt-1">65% de cumplimiento</p>
              </div>
              <div className="p-3 rounded-lg bg-accent border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status="neutral" label="Info" size="sm" />
                </div>
                <p className="text-sm text-foreground font-medium">Archivo CSV pendiente</p>
                <p className="text-xs text-muted-foreground mt-1">Última carga: hace 3 días</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
