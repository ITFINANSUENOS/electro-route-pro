import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MapPin,
  FileText,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels, menuOrderByRole, UserRole } from '@/types/auth';
import logoFinansuenos from '@/assets/logo-finansuenos.png';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useActivityNotification } from '@/hooks/useActivityNotification';

interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const allNavItems: NavItem[] = [
  { 
    id: 'dashboard',
    title: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    roles: ['asesor_comercial', 'jefe_ventas', 'lider_zona', 'coordinador_comercial', 'administrativo', 'administrador']
  },
  { 
    id: 'programacion',
    title: 'Programación', 
    href: '/programacion', 
    icon: Calendar,
    roles: ['asesor_comercial', 'jefe_ventas', 'lider_zona', 'coordinador_comercial', 'administrador']
  },
  { 
    id: 'informacion',
    title: 'Información', 
    href: '/informacion', 
    icon: Settings,
    roles: ['lider_zona', 'coordinador_comercial', 'administrador']
  },
  { 
    id: 'actividades',
    title: 'Actividades', 
    href: '/actividades', 
    icon: ClipboardCheck,
    roles: ['asesor_comercial', 'jefe_ventas', 'lider_zona', 'coordinador_comercial', 'administrador']
  },
  { 
    id: 'cargar-ventas',
    title: 'Cargar Ventas', 
    href: '/cargar-ventas', 
    icon: FileText,
    roles: ['administrativo']
  },
  { 
    id: 'mapa',
    title: 'Mapa', 
    href: '/mapa', 
    icon: MapPin,
    roles: ['lider_zona', 'coordinador_comercial', 'administrador']
  },
  { 
    id: 'usuarios',
    title: 'Usuarios', 
    href: '/usuarios', 
    icon: Users,
    roles: ['administrador']
  },
  { 
    id: 'configuracion',
    title: 'Configuración', 
    href: '/configuracion', 
    icon: Settings,
    roles: ['administrador']
  },
];

function SidebarContent({ 
  collapsed, 
  setCollapsed, 
  filteredNavItems, 
  location, 
  profile, 
  role, 
  signOut,
  onNavClick,
  showActivityNotification,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  filteredNavItems: NavItem[];
  location: { pathname: string };
  profile: any;
  role: UserRole | null;
  signOut: () => void;
  onNavClick?: () => void;
  showActivityNotification?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 sm:h-20 px-4 border-b border-sidebar-border">
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
                className="h-10 sm:h-12 object-contain"
              />
              <span className="text-sidebar-foreground/80 text-xs mt-1">
                Sistema E-COM
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 sm:py-4 px-2 sm:px-3">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const showBadge = item.id === 'actividades' && showActivityNotification;

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 sm:py-2.5 text-sm font-medium transition-all duration-200 relative',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <div className="relative">
                    <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-secondary')} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                    )}
                  </div>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap flex items-center gap-2"
                      >
                        {item.title}
                        {showBadge && (
                          <span className="w-2 h-2 bg-destructive rounded-full" />
                        )}
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
      <div className="border-t border-sidebar-border p-2 sm:p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg p-2',
            collapsed ? 'justify-center' : ''
          )}
        >
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-secondary-foreground font-semibold text-xs sm:text-sm">
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
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { showNotification: showActivityNotification } = useActivityNotification();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Filter and sort nav items based on user role
  const filteredNavItems = (() => {
    if (!role) return [];
    
    // Filter items by role
    const roleItems = allNavItems.filter(item => item.roles.includes(role));
    
    // Get menu order for this role
    const menuOrder = menuOrderByRole[role] || [];
    
    // Sort by menu order
    return roleItems.sort((a, b) => {
      const indexA = menuOrder.indexOf(a.id);
      const indexB = menuOrder.indexOf(b.id);
      
      // Items not in order go to the end
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
  })();

  // Mobile: Use Sheet drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Header Bar */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border z-40 flex items-center px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-sidebar-border">
              <SidebarContent
                collapsed={false}
                setCollapsed={setCollapsed}
                filteredNavItems={filteredNavItems}
                location={location}
                profile={profile}
                role={role}
                signOut={signOut}
                onNavClick={() => setMobileOpen(false)}
                showActivityNotification={showActivityNotification}
              />
            </SheetContent>
          </Sheet>
          <div className="flex-1 flex justify-center">
            <img
              src={logoFinansuenos}
              alt="FinanSueños"
              className="h-8 object-contain"
            />
          </div>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
        {/* Spacer for fixed header */}
        <div className="h-14" />
      </>
    );
  }

  // Desktop: Full sidebar
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border flex-shrink-0"
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

      <SidebarContent
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        filteredNavItems={filteredNavItems}
        location={location}
        profile={profile}
        role={role}
        signOut={signOut}
        showActivityNotification={showActivityNotification}
      />
    </motion.aside>
  );
}
