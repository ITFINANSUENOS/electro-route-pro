import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Calculator, Save, Building2, Users, Percent, Download, Upload } from 'lucide-react';
import { exportPromediosTemplate } from '@/utils/exportPromediosTemplate';
import { importPromediosFromExcel } from '@/utils/importPromediosTemplate';

const TIPOS_ASESOR = ['INTERNO', 'EXTERNO', 'CORRETAJE'] as const;
const TIPOS_VENTA = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO'] as const;

const tiposVentaLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  CONVENIO: 'Convenio',
};

const tiposAsesorLabels: Record<string, string> = {
  INTERNO: 'Interno',
  EXTERNO: 'Externo',
  CORRETAJE: 'Corretaje',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format number for input display (e.g., 2.895.000)
const formatCurrencyInput = (value: number): string => {
  if (!value || value === 0) return '';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format percentage with comma as decimal separator
const formatPercentageDisplay = (value: number): string => {
  if (!value || value === 0) return '';
  return value.toString().replace('.', ',');
};

// Parse percentage input (allows comma as decimal separator)
const parsePercentageInput = (value: string): number => {
  const cleanValue = value.replace(',', '.').replace(/[^\d.]/g, '');
  return parseFloat(cleanValue) || 0;
};

interface PromedioConfig {
  regional_id: string;
  tipo_asesor: string;
  tipo_venta: string;
  valor_promedio: number;
}

interface PorcentajeConfig {
  regional_id: string;
  porcentaje_aumento_1: number;
  porcentaje_aumento_2: number;
  porcentaje_aumento_3: number;
}

export function MetasConfig() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRegionales, setSelectedRegionales] = useState<string[]>([]);
  const [localPromedios, setLocalPromedios] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [localPorcentajes, setLocalPorcentajes] = useState<Record<string, PorcentajeConfig>>({});
  // Store porcentaje input strings separately to allow typing with comma
  const [porcentajeInputs, setPorcentajeInputs] = useState<Record<string, Record<string, string>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch regionales
  const { data: regionales = [], isLoading: loadingRegionales } = useQuery({
    queryKey: ['regionales-metas-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regionales')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing promedio configs
  const { data: promediosData = [], isLoading: loadingPromedios } = useQuery({
    queryKey: ['config-metas-promedio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_metas_promedio')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing porcentaje configs
  const { data: porcentajesData = [], isLoading: loadingPorcentajes } = useQuery({
    queryKey: ['config-metas-porcentajes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_metas_porcentajes')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Build initial state from fetched data
  const initialPromedios = useMemo(() => {
    const result: Record<string, Record<string, Record<string, number>>> = {};
    promediosData.forEach((p: any) => {
      if (!result[p.regional_id]) result[p.regional_id] = {};
      if (!result[p.regional_id][p.tipo_asesor]) result[p.regional_id][p.tipo_asesor] = {};
      result[p.regional_id][p.tipo_asesor][p.tipo_venta] = p.valor_promedio;
    });
    return result;
  }, [promediosData]);

  const initialPorcentajes = useMemo(() => {
    const result: Record<string, PorcentajeConfig> = {};
    porcentajesData.forEach((p: any) => {
      result[p.regional_id] = {
        regional_id: p.regional_id,
        porcentaje_aumento_1: p.porcentaje_aumento_1,
        porcentaje_aumento_2: p.porcentaje_aumento_2,
        porcentaje_aumento_3: p.porcentaje_aumento_3,
      };
    });
    return result;
  }, [porcentajesData]);

  // Get merged state (initial + local changes)
  const getPromedioValue = (regionalId: string, tipoAsesor: string, tipoVenta: string): number => {
    return localPromedios[regionalId]?.[tipoAsesor]?.[tipoVenta] 
      ?? initialPromedios[regionalId]?.[tipoAsesor]?.[tipoVenta] 
      ?? 0;
  };

  // Get porcentaje display value - use input string if available, else format from number
  const getPorcentajeDisplayValue = (regionalId: string, field: keyof PorcentajeConfig): string => {
    if (field === 'regional_id') return '';
    // If there's an input string being edited, use that
    const inputValue = porcentajeInputs[regionalId]?.[field];
    if (inputValue !== undefined) return inputValue;
    // Otherwise, format the stored number
    const numValue = localPorcentajes[regionalId]?.[field] 
      ?? initialPorcentajes[regionalId]?.[field] 
      ?? 0;
    if (numValue === 0) return '';
    return formatPercentageDisplay(numValue);
  };

  // Handle promedio change - allow full currency values
  const handlePromedioChange = (regionalId: string, tipoAsesor: string, tipoVenta: string, value: string) => {
    // Remove all non-numeric characters (dots are thousand separators in CO format)
    const cleanValue = value.replace(/[^\d]/g, '');
    const numValue = parseInt(cleanValue, 10) || 0;
    setLocalPromedios(prev => ({
      ...prev,
      [regionalId]: {
        ...prev[regionalId],
        [tipoAsesor]: {
          ...prev[regionalId]?.[tipoAsesor],
          [tipoVenta]: numValue,
        },
      },
    }));
    setHasChanges(true);
  };

  // Handle porcentaje input change - store string for display
  const handlePorcentajeInputChange = (regionalId: string, field: keyof PorcentajeConfig, value: string) => {
    if (field === 'regional_id') return;
    // Only allow digits and one comma
    const filteredValue = value.replace(/[^\d,]/g, '').replace(/(,.*),/g, '$1');
    setPorcentajeInputs(prev => ({
      ...prev,
      [regionalId]: {
        ...prev[regionalId],
        [field]: filteredValue,
      },
    }));
    setHasChanges(true);
  };

  // Handle porcentaje blur - parse and store numeric value
  const handlePorcentajeBlur = (regionalId: string, field: keyof PorcentajeConfig) => {
    if (field === 'regional_id') return;
    const inputValue = porcentajeInputs[regionalId]?.[field] ?? '';
    const numValue = parsePercentageInput(inputValue);
    
    setLocalPorcentajes(prev => ({
      ...prev,
      [regionalId]: {
        ...prev[regionalId],
        regional_id: regionalId,
        porcentaje_aumento_1: prev[regionalId]?.porcentaje_aumento_1 ?? initialPorcentajes[regionalId]?.porcentaje_aumento_1 ?? 0,
        porcentaje_aumento_2: prev[regionalId]?.porcentaje_aumento_2 ?? initialPorcentajes[regionalId]?.porcentaje_aumento_2 ?? 0,
        porcentaje_aumento_3: prev[regionalId]?.porcentaje_aumento_3 ?? initialPorcentajes[regionalId]?.porcentaje_aumento_3 ?? 0,
        [field]: numValue,
      },
    }));
    
    // Clear the input string so it uses the formatted number
    setPorcentajeInputs(prev => {
      const newInputs = { ...prev };
      if (newInputs[regionalId]) {
        delete newInputs[regionalId][field];
      }
      return newInputs;
    });
  };

  // Toggle regional selection
  const toggleRegional = (regionalId: string) => {
    setSelectedRegionales(prev =>
      prev.includes(regionalId)
        ? prev.filter(r => r !== regionalId)
        : [...prev, regionalId]
    );
  };

  // Select all regionales
  const selectAllRegionales = () => {
    if (selectedRegionales.length === regionales.length) {
      setSelectedRegionales([]);
    } else {
      setSelectedRegionales(regionales.map(r => r.id));
    }
  };

  // Save mutation for promedios
  const savePromediosMutation = useMutation({
    mutationFn: async (promedios: PromedioConfig[]) => {
      for (const p of promedios) {
        const { error } = await supabase
          .from('config_metas_promedio')
          .upsert({
            regional_id: p.regional_id,
            tipo_asesor: p.tipo_asesor,
            tipo_venta: p.tipo_venta,
            valor_promedio: p.valor_promedio,
          }, {
            onConflict: 'regional_id,tipo_asesor,tipo_venta',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-metas-promedio'] });
    },
  });

  // Save mutation for porcentajes
  const savePorcentajesMutation = useMutation({
    mutationFn: async (porcentajes: PorcentajeConfig[]) => {
      for (const p of porcentajes) {
        const { error } = await supabase
          .from('config_metas_porcentajes')
          .upsert({
            regional_id: p.regional_id,
            porcentaje_aumento_1: p.porcentaje_aumento_1,
            porcentaje_aumento_2: p.porcentaje_aumento_2,
            porcentaje_aumento_3: p.porcentaje_aumento_3,
          }, {
            onConflict: 'regional_id',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-metas-porcentajes'] });
    },
  });

  // Save all changes
  const handleSave = async () => {
    try {
      // Collect all promedio changes
      const promediosToSave: PromedioConfig[] = [];
      Object.entries(localPromedios).forEach(([regionalId, tiposAsesor]) => {
        Object.entries(tiposAsesor).forEach(([tipoAsesor, tiposVenta]) => {
          Object.entries(tiposVenta).forEach(([tipoVenta, valor]) => {
            promediosToSave.push({
              regional_id: regionalId,
              tipo_asesor: tipoAsesor,
              tipo_venta: tipoVenta,
              valor_promedio: valor,
            });
          });
        });
      });

      // First, process any pending porcentaje inputs
      Object.entries(porcentajeInputs).forEach(([regionalId, fields]) => {
        Object.entries(fields).forEach(([field, inputValue]) => {
          const numValue = parsePercentageInput(inputValue);
          setLocalPorcentajes(prev => ({
            ...prev,
            [regionalId]: {
              ...prev[regionalId],
              regional_id: regionalId,
              porcentaje_aumento_1: prev[regionalId]?.porcentaje_aumento_1 ?? initialPorcentajes[regionalId]?.porcentaje_aumento_1 ?? 0,
              porcentaje_aumento_2: prev[regionalId]?.porcentaje_aumento_2 ?? initialPorcentajes[regionalId]?.porcentaje_aumento_2 ?? 0,
              porcentaje_aumento_3: prev[regionalId]?.porcentaje_aumento_3 ?? initialPorcentajes[regionalId]?.porcentaje_aumento_3 ?? 0,
              [field]: numValue,
            },
          }));
        });
      });

      // Collect all porcentaje changes (including just-processed inputs)
      const porcentajesToSave: PorcentajeConfig[] = Object.values(localPorcentajes);

      // Save both
      if (promediosToSave.length > 0) {
        await savePromediosMutation.mutateAsync(promediosToSave);
      }
      if (porcentajesToSave.length > 0) {
        await savePorcentajesMutation.mutateAsync(porcentajesToSave);
      }

      setLocalPromedios({});
      setLocalPorcentajes({});
      setPorcentajeInputs({});
      setHasChanges(false);
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    }
  };

  // Download template handler
  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const result = await exportPromediosTemplate();
      if (result.success) {
        toast.success(`Plantilla descargada con ${result.count} regionales`);
      } else {
        toast.error(result.error || 'Error al descargar la plantilla');
      }
    } catch (error) {
      toast.error('Error al generar la plantilla');
    } finally {
      setIsDownloading(false);
    }
  };

  // Upload file handler
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await importPromediosFromExcel(file);
      if (result.success) {
        toast.success(`Se importaron ${result.imported} valores de promedio`);
        queryClient.invalidateQueries({ queryKey: ['config-metas-promedio'] });
        setLocalPromedios({});
        setHasChanges(false);
      } else {
        toast.error(result.errors[0] || 'Error al importar los datos');
      }
      if (result.errors.length > 0 && result.imported > 0) {
        console.warn('Errores durante la importación:', result.errors);
      }
    } catch (error) {
      toast.error('Error al procesar el archivo');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const displayedRegionales = selectedRegionales.length > 0
    ? regionales.filter(r => selectedRegionales.includes(r.id))
    : regionales;

  const isLoading = loadingRegionales || loadingPromedios || loadingPorcentajes;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header with filter and save */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Configuración de Metas por Cantidad
          </h3>
          <p className="text-sm text-muted-foreground">
            Define los valores promedio de venta por regional, tipo de asesor y tipo de venta
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline"
            onClick={handleDownloadTemplate}
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Descargando...' : 'Descargar Plantilla'}
          </Button>
          <Button 
            variant="outline"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Cargando...' : 'Cargar Promedios'}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || savePromediosMutation.isPending || savePorcentajesMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Regional Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-secondary" />
            Filtrar por Regional
          </CardTitle>
          <CardDescription>Selecciona las regionales que deseas configurar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedRegionales.length === regionales.length}
                onCheckedChange={selectAllRegionales}
              />
              <span className="text-sm font-medium">Todas</span>
            </label>
            <Separator orientation="vertical" className="h-6" />
            {regionales.map(regional => (
              <label key={regional.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedRegionales.includes(regional.id)}
                  onCheckedChange={() => toggleRegional(regional.id)}
                />
                <span className="text-sm">{regional.nombre}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tables per Regional */}
      <ScrollArea className="w-full">
        <div className="space-y-6 min-w-[800px]">
          {displayedRegionales.map(regional => (
            <Card key={regional.id} className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline" className="mr-2">
                      {regional.codigo}
                    </Badge>
                    {regional.nombre}
                  </CardTitle>
                  <Badge variant="secondary">{regional.zona}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Promedios por Tipo de Asesor con % de Aumento */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Valor Promedio de Venta por Tipo
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground w-28">Tipo Asesor</th>
                          {TIPOS_VENTA.map(tipo => (
                            <th key={tipo} className="text-center py-2 px-2 font-medium text-muted-foreground">
                              {tiposVentaLabels[tipo]}
                            </th>
                          ))}
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground bg-muted/30">
                            <div className="flex items-center justify-center gap-1">
                              <Percent className="h-3 w-3" />
                              Aumento
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {TIPOS_ASESOR.map((tipoAsesor, index) => {
                          const porcentajeField = `porcentaje_aumento_${index + 1}` as keyof PorcentajeConfig;
                          return (
                            <tr key={tipoAsesor} className="border-b">
                              <td className="py-2 px-3 font-medium">{tiposAsesorLabels[tipoAsesor]}</td>
                              {TIPOS_VENTA.map(tipoVenta => (
                                <td key={tipoVenta} className="py-2 px-1">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                    <Input
                                      type="text"
                                      value={formatCurrencyInput(getPromedioValue(regional.id, tipoAsesor, tipoVenta))}
                                      onChange={(e) => handlePromedioChange(regional.id, tipoAsesor, tipoVenta, e.target.value)}
                                      className="pl-5 text-right h-9 w-full min-w-[130px] font-mono text-sm"
                                      placeholder="0"
                                    />
                                  </div>
                                </td>
                              ))}
                              <td className="py-2 px-1 bg-muted/30">
                                <div className="relative">
                                  <Input
                                    type="text"
                                    value={getPorcentajeDisplayValue(regional.id, porcentajeField)}
                                    onChange={(e) => handlePorcentajeInputChange(regional.id, porcentajeField, e.target.value)}
                                    onBlur={() => handlePorcentajeBlur(regional.id, porcentajeField)}
                                    className="pr-6 text-right h-9 w-24 font-mono text-sm"
                                    placeholder="0"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {displayedRegionales.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>Selecciona al menos una regional para ver la configuración</p>
        </Card>
      )}
    </div>
  );
}
