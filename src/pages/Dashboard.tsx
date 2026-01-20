import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLider from '@/components/dashboard/DashboardLider';
import DashboardAsesor from '@/components/dashboard/DashboardAsesor';
import DashboardJefe from '@/components/dashboard/DashboardJefe';

export default function Dashboard() {
  const { role } = useAuth();

  // Render different dashboards based on role
  if (role === 'asesor_comercial') {
    return <DashboardAsesor />;
  }

  if (role === 'jefe_ventas') {
    return <DashboardJefe />;
  }

  // lider_zona, coordinador_comercial, administrativo, administrador
  return <DashboardLider />;
}
