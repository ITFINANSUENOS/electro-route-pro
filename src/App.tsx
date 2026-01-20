import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Programacion from "./pages/Programacion";
import Actividades from "./pages/Actividades";
import CargarVentas from "./pages/CargarVentas";
import Mapa from "./pages/Mapa";
import Reportes from "./pages/Reportes";
import Informacion from "./pages/Informacion";
import Usuarios from "./pages/Usuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/programacion" element={<Programacion />} />
              <Route path="/actividades" element={<Actividades />} />
              <Route path="/cargar-ventas" element={<CargarVentas />} />
              <Route path="/mapa" element={<Mapa />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/informacion" element={<Informacion />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/configuracion" element={<Dashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
