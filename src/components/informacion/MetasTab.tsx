import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Upload, FileSpreadsheet, ChevronDown, ChevronUp, TrendingUp, Download, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { exportMetasTemplate } from '@/utils/exportMetasTemplate';
import { useMetaQuantityConfig } from '@/hooks/useMetaQuantityConfig';
import { calculateMetaQuantity, MetaQuantityResult } from '@/utils/calculateMetaQuantity';
import { importMetasCSV } from '@/utils/importMetasCSV';

interface MetaData {
  id: string;
  codigo_asesor: string;
  valor_meta: number;
  mes: number;
  anio: number;
  tipo_meta: string | null;
}

interface ProfileWithRegional {
  codigo_asesor: string;
  nombre_completo: string;
  tipo_asesor: string | null;
  regional_id: string | null;
}

const tiposVenta = [
  { key: 'credito', label: 'Crédito', color: 'bg-primary' },
  { key: 'aliados', label: 'Aliados', color: 'bg-secondary' },
  { key: 'credicontado', label: 'Credi Contado', color: 'bg-warning' },
  { key: 'contado', label: 'Contado', color: 'bg-success' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function MetasTab() {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [selectedTipoVenta, setSelectedTipoVenta] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, profile } = useAuth();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Fetch metas with advisor info
  const { data: metas, isLoading } = useQuery({
    queryKey: ['metas', currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('mes', currentMonth)
        .eq('anio', currentYear);
      
      if (error) throw error;
      return data as MetaData[];
    },
  });

  // Fetch profiles for advisor names and tipo_asesor
  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-metas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('codigo_asesor, nombre_completo, tipo_asesor, regional_id');
      
      if (error) throw error;
      return data as ProfileWithRegional[];
    },
  });

  // Fetch meta quantity config (promedios y porcentajes)
  const { data: metaQuantityConfig, isLoading: loadingConfig } = useMetaQuantityConfig();

  const getAdvisorInfo = (codigoAsesor: string): ProfileWithRegional | undefined => {
    return profiles?.find(p => p.codigo_asesor === codigoAsesor);
  };

  const getAdvisorName = (codigoAsesor: string) => {
    const profile = getAdvisorInfo(codigoAsesor);
    return profile?.nombre_completo || codigoAsesor;
  };

  // Calculate quantity for a meta value
  const calculateQuantity = (
    valorMeta: number,
    tipoVenta: string,
    codigoAsesor: string
  ): MetaQuantityResult | null => {
    if (!metaQuantityConfig || valorMeta <= 0) return null;
    
    const advisorInfo = getAdvisorInfo(codigoAsesor);
    if (!advisorInfo?.tipo_asesor || !advisorInfo?.regional_id) return null;

    return calculateMetaQuantity(
      valorMeta,
      advisorInfo.tipo_asesor,
      tipoVenta,
      advisorInfo.regional_id,
      metaQuantityConfig
    );
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) 
        ? prev.filter(row => row !== id) 
        : [...prev, id]
    );
  };

  const handleUploadMetas = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      toast({
        title: 'Procesando archivo',
        description: `Cargando ${file.name}...`,
      });

      try {
        const content = await file.text();
        const result = await importMetasCSV(content, currentMonth, currentYear);

        if (result.success) {
          toast({
            title: 'Metas cargadas exitosamente',
            description: `Se importaron ${result.imported} metas para ${currentMonth}/${currentYear}`,
          });
          // Refresh the metas query
          queryClient.invalidateQueries({ queryKey: ['metas', currentMonth, currentYear] });
        } else {
          toast({
            title: 'Error al cargar metas',
            description: result.errors.join(', ') || 'Error desconocido',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error uploading metas:', error);
        toast({
          title: 'Error',
          description: 'Error al procesar el archivo CSV',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const result = await exportMetasTemplate(role, profile?.regional_id || null, profile?.zona || null);
      
      if (result.success) {
        toast({
          title: 'Plantilla descargada',
          description: `Se descargó la plantilla con ${result.count} asesores activos`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo descargar la plantilla',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al generar la plantilla',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Calculate totals
  const totalMeta = metas?.reduce((sum, m) => sum + m.valor_meta, 0) || 0;
  const uniqueAdvisors = new Set(metas?.map(m => m.codigo_asesor)).size;

  // Group metas by advisor
  const metasByAdvisor = metas?.reduce((acc, meta) => {
    if (!acc[meta.codigo_asesor]) {
      acc[meta.codigo_asesor] = [];
    }
    acc[meta.codigo_asesor].push(meta);
    return acc;
  }, {} as Record<string, MetaData[]>) || {};

  const filteredAdvisors = Object.entries(metasByAdvisor).filter(([_, metasList]) => {
    if (selectedTipoVenta === 'all') return true;
    return metasList.some(m => m.tipo_meta === selectedTipoVenta);
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meta Total del Mes</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMeta)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asesores con Meta</p>
                <p className="text-2xl font-bold">{uniqueAdvisors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent">
                <FileSpreadsheet className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="text-2xl font-bold capitalize">
                  {format(new Date(), 'MMMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={handleDownloadTemplate}
          disabled={isDownloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Descargando...' : 'Plantilla Metas'}
        </Button>
        <Button onClick={handleUploadMetas} className="btn-brand" disabled={isUploading}>
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? 'Cargando...' : 'Cargar Metas (.CSV)'}
        </Button>
      </div>

      {/* Metas Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Metas por Asesor</CardTitle>
          <CardDescription>
            Distribución de metas del mes por tipo de venta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tipo Venta Filter */}
          <Tabs value={selectedTipoVenta} onValueChange={setSelectedTipoVenta} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              {tiposVenta.map(tipo => (
                <TabsTrigger key={tipo.key} value={tipo.key}>
                  {tipo.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground"></th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Asesor</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <span>Meta Total</span>
                      <span className="text-xs font-normal">($ / Uds)</span>
                    </div>
                  </th>
                  {tiposVenta.map(tipo => (
                    <th key={tipo.key} className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <span>{tipo.label}</span>
                        <span className="text-xs font-normal">($ / Uds)</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading || loadingConfig ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Cargando metas...
                    </td>
                  </tr>
                ) : filteredAdvisors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay metas registradas para este período
                    </td>
                  </tr>
                ) : (
                  filteredAdvisors.map(([codigoAsesor, metasList]) => {
                    const isExpanded = expandedRows.includes(codigoAsesor);
                    const totalAsesor = metasList.reduce((sum, m) => sum + m.valor_meta, 0);
                    const advisorInfo = getAdvisorInfo(codigoAsesor);
                    
                    // Calculate metas by tipo and quantities
                    const metasByTipo = tiposVenta.reduce((acc, tipo) => {
                      const valorMeta = metasList.find(m => m.tipo_meta === tipo.key)?.valor_meta || 0;
                      const quantityResult = calculateQuantity(valorMeta, tipo.key.toUpperCase(), codigoAsesor);
                      acc[tipo.key] = {
                        valor: valorMeta,
                        cantidad: quantityResult?.cantidadFinal || 0,
                        desglose: quantityResult,
                      };
                      return acc;
                    }, {} as Record<string, { valor: number; cantidad: number; desglose: MetaQuantityResult | null }>);

                    // Calculate total quantity
                    const totalCantidad = Object.values(metasByTipo).reduce((sum, m) => sum + m.cantidad, 0);

                    return (
                      <motion.tr
                        key={codigoAsesor}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => toggleRow(codigoAsesor)}
                      >
                        <td className="py-4 px-4">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{getAdvisorName(codigoAsesor)}</span>
                            {advisorInfo?.tipo_asesor && (
                              <Badge variant="outline" className="w-fit text-xs mt-1">
                                {advisorInfo.tipo_asesor}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold">{formatCurrency(totalAsesor)}</span>
                            {totalCantidad > 0 && (
                              <Badge variant="secondary" className="mt-1">
                                <Hash className="h-3 w-3 mr-1" />
                                {totalCantidad} uds
                              </Badge>
                            )}
                          </div>
                        </td>
                        {tiposVenta.map(tipo => {
                          const metaTipo = metasByTipo[tipo.key];
                          return (
                            <td key={tipo.key} className="py-4 px-4 text-center">
                              {metaTipo.valor > 0 ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex flex-col items-center cursor-help">
                                        <span>{formatCurrency(metaTipo.valor)}</span>
                                        {metaTipo.cantidad > 0 && (
                                          <Badge variant="outline" className="mt-1 text-xs">
                                            {metaTipo.cantidad} uds
                                          </Badge>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    {metaTipo.desglose && (
                                      <TooltipContent className="max-w-xs p-3">
                                        <div className="space-y-1 text-xs">
                                          <p><strong>Cálculo de cantidad:</strong></p>
                                          <p>Meta: {formatCurrency(metaTipo.desglose.valorMeta)}</p>
                                          <p>+ {metaTipo.desglose.porcentajeAumento}% aumento = {formatCurrency(metaTipo.desglose.valorConAumento)}</p>
                                          <p>÷ Promedio: {formatCurrency(metaTipo.desglose.valorPromedio)}</p>
                                          <p>= {metaTipo.desglose.cantidadCalculada.toFixed(2)} → <strong>{metaTipo.desglose.cantidadFinal} unidades</strong></p>
                                        </div>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          );
                        })}
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Show more button */}
          {filteredAdvisors.length > 10 && (
            <div className="flex justify-center mt-4">
              <Button variant="outline">
                Ver más asesores
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
