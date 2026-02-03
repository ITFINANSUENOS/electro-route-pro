import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Upload, FileSpreadsheet, ChevronDown, ChevronUp, TrendingUp, Download, Hash, FileDown, AlertTriangle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { exportMetasTemplate } from '@/utils/exportMetasTemplate';
import { exportMetasDetailExcel } from '@/utils/exportMetasDetailExcel';
import { useMetaQuantityConfig } from '@/hooks/useMetaQuantityConfig';
import { calculateMetaQuantity, MetaQuantityResult } from '@/utils/calculateMetaQuantity';
import { importMetasCSV } from '@/utils/importMetasCSV';
import { usePeriodSelector, formatPeriodLabel } from '@/hooks/usePeriodSelector';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';

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
  const [isDownloadingDetail, setIsDownloadingDetail] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, profile } = useAuth();

  const isAdmin = role === 'administrador';

  // Period selector - only admins can change periods
  const {
    selectedPeriod,
    periodValue,
    handlePeriodChange,
    availablePeriods,
    isLoading: isLoadingPeriods,
    isPeriodClosed,
    periodLabel,
  } = usePeriodSelector();

  const currentMonth = selectedPeriod.mes;
  const currentYear = selectedPeriod.anio;

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

  // Fetch historial de metas
  const { data: historialMetas } = useQuery({
    queryKey: ['historial-metas', currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historial_metas')
        .select('*')
        .eq('mes', currentMonth)
        .eq('anio', currentYear)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch user names for historial
  const { data: historialUsers } = useQuery({
    queryKey: ['historial-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, nombre_completo');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && !!historialMetas?.length,
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
    // Only admin can upload to closed periods
    if (isPeriodClosed && !isAdmin) {
      toast({
        title: 'Período cerrado',
        description: 'Solo el administrador puede modificar metas de períodos cerrados',
        variant: 'destructive',
      });
      return;
    }

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
            description: `Se importaron ${result.imported} metas para ${periodLabel}`,
          });
          // Refresh the metas query
          queryClient.invalidateQueries({ queryKey: ['metas', currentMonth, currentYear] });
          queryClient.invalidateQueries({ queryKey: ['historial-metas', currentMonth, currentYear] });
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

  const handleDownloadDetail = async () => {
    setIsDownloadingDetail(true);
    try {
      const result = await exportMetasDetailExcel(role, profile?.regional_id || null, profile?.zona || null, currentMonth, currentYear);
      
      if (result.success) {
        toast({
          title: 'Reporte descargado',
          description: `Se descargó el detalle de metas para ${result.count} asesores`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo descargar el reporte',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al generar el reporte',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingDetail(false);
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

  // Helper to get user name for historial
  const getUserName = (userId: string | null) => {
    if (!userId) return 'Sistema';
    const user = historialUsers?.find(u => u.user_id === userId);
    return user?.nombre_completo || 'Usuario';
  };

  return (
    <div className="space-y-6">
      {/* Period Selector for Admin */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <PeriodSelector
              value={periodValue}
              onChange={handlePeriodChange}
              periods={availablePeriods}
              isLoading={isLoadingPeriods}
            />
          </div>
          
          {isPeriodClosed && (
            <Alert className="max-w-lg">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este período está cerrado. Las metas cargadas reemplazarán las existentes.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

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
                  {periodLabel}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={handleDownloadTemplate}
          disabled={isDownloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Descargando...' : 'Plantilla Metas'}
        </Button>
        <Button 
          variant="outline" 
          onClick={handleDownloadDetail}
          disabled={isDownloadingDetail || !metas || metas.length === 0}
        >
          <FileDown className="mr-2 h-4 w-4" />
          {isDownloadingDetail ? 'Generando...' : 'Descargar Metas ($ y Q)'}
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

      {/* Historial de Cambios - Solo para Admin */}
      {isAdmin && historialMetas && historialMetas.length > 0 && (
        <Card className="card-elevated">
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Historial de Cambios</CardTitle>
                    <Badge variant="outline">{historialMetas.length}</Badge>
                  </div>
                  {historyOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {historialMetas.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                        <Badge variant={item.accion === 'carga_masiva' ? 'default' : 'secondary'}>
                          {item.accion === 'carga_masiva' ? 'Carga inicial' : 'Corrección'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getUserName(item.modificado_por)} • {item.registros_afectados} metas
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.monto_total_anterior > 0 && (
                          <>
                            Total anterior: {formatCurrency(item.monto_total_anterior)} → 
                          </>
                        )}
                        Total nuevo: {formatCurrency(item.monto_total_nuevo)}
                      </p>
                      {item.notas && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {item.notas}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}
