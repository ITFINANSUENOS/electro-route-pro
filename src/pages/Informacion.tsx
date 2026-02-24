import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Upload, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CargarVentasTab from '@/components/informacion/CargarVentasTab';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Información</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Gestiona ventas y metas del equipo comercial</p>
          </div>
        </div>
      </div>

      {/* Tabs - Solo Ventas y Metas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="ventas" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Cargar Ventas
          </TabsTrigger>
          <TabsTrigger value="metas" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="mt-6">
          <CargarVentasTab />
        </TabsContent>

        <TabsContent value="metas" className="mt-6">
          <MetasTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
