import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className={`flex-1 overflow-x-hidden overflow-y-auto ${isMobile ? 'w-full pt-14' : ''}`}>
        <div className="container mx-auto py-4 px-3 sm:py-6 sm:px-4 md:px-6 lg:px-8 max-w-full overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
