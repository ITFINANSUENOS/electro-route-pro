import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CreditCard, History, Shield } from "lucide-react";
import { RegionalesConfig } from "@/components/configuracion/RegionalesConfig";
import { FormasPagoConfig } from "@/components/configuracion/FormasPagoConfig";
import { HistorialCambios } from "@/components/configuracion/HistorialCambios";
import { PermisosConfig } from "@/components/configuracion/PermisosConfig";

export default function Configuracion() {
  const { role } = useAuth();

  if (role !== 'administrador') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">No tienes permisos para ver esta página</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración del Sistema</h1>
        <p className="text-muted-foreground">
          Administra las tablas paramétricas y configuraciones del sistema
        </p>
      </div>

      <Tabs defaultValue="regionales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
          <TabsTrigger value="regionales" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Regionales
          </TabsTrigger>
          <TabsTrigger value="formas-pago" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Formas de Pago
          </TabsTrigger>
          <TabsTrigger value="permisos" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permisos
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regionales">
          <RegionalesConfig />
        </TabsContent>

        <TabsContent value="formas-pago">
          <FormasPagoConfig />
        </TabsContent>

        <TabsContent value="permisos">
          <PermisosConfig />
        </TabsContent>

        <TabsContent value="historial">
          <HistorialCambios />
        </TabsContent>
      </Tabs>
    </div>
  );
}
