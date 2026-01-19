import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  Upload,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/types/auth';
import logoFinansuenos from '@/assets/logo-finansuenos.png';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Programación', href: '/programacion', icon: Calendar, permission: 'view_schedule' },
  { title: 'Actividades', href: '/actividades', icon: ClipboardCheck, permission: 'register_activity' },
  { title: 'Cargar Ventas', href: '/cargar-ventas', icon: Upload, permission: 'upload_sales' },
  { title: 'Metas', href: '/metas', icon: Target, permission: 'upload_goals' },
  { title: 'Reportes', href: '/reportes', icon: BarChart3, permission: 'view_reports' },
  { title: 'Mapa', href: '/mapa', icon: MapPin },
  { title: 'Usuarios', href: '/usuarios', icon: Users, permission: 'full_access' },
  { title: 'Configuración', href: '/configuracion', icon: Settings, permission: 'full_access' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, role, signOut, hasPermission } = useAuth();

  const filteredNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission) || role === 'administrador'
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border"
    >
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground shadow-md hover:bg-secondary transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Logo */}
      <div className="flex items-center justify-center h-20 px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-10 h-10 rounded-lg bg-white flex items-center justify-center"
            >
              <span className="text-primary font-bold text-xl">E</span>
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <img
                src={logoFinansuenos}
                alt="FinanSueños"
                className="h-12 object-contain"
              />
              <span className="text-sidebar-foreground/80 text-xs mt-1">
                Sistema E-COM
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-secondary')} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg p-2',
            collapsed ? 'justify-center' : ''
          )}
        >
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-secondary-foreground font-semibold text-sm">
              {profile?.nombre_completo?.charAt(0) || 'U'}
            </span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden"
              >
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.nombre_completo || 'Usuario'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {role ? roleLabels[role] : 'Sin rol'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={signOut}
          className={cn(
            'mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors w-full',
            collapsed ? 'justify-center' : ''
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
