import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Upload, Target, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CargarVentasTab from '@/components/informacion/CargarVentasTab';
import CargarEquipoTab from '@/components/informacion/CargarEquipoTab';
import MetasTab from '@/components/informacion/MetasTab';

export default function Informacion() {
  const [activeTab, setActiveTab] = useState('ventas');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-secondary" />
            Información
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la carga de ventas, equipo y metas del equipo comercial
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="ventas" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Cargar Ventas
          </TabsTrigger>
          <TabsTrigger value="equipo" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cargar Equipo
          </TabsTrigger>
          <TabsTrigger value="metas" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="mt-6">
          <CargarVentasTab />
        </TabsContent>

        <TabsContent value="equipo" className="mt-6">
          <CargarEquipoTab />
        </TabsContent>

        <TabsContent value="metas" className="mt-6">
          <MetasTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
