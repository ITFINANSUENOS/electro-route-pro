import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Target,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Camera,
  MapPin,
  Building2,
  FileText,
  Hash,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RegionalMultiSelect } from './RegionalMultiSelect';
import { TipoAsesorMultiSelect } from './TipoAsesorMultiSelect';
import { PeriodSelector } from './PeriodSelector';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/types/auth';
import { dataService } from '@/services';
import { useQuery } from '@tanstack/react-query';
import { exportRankingToExcel, RankingAdvisor } from '@/utils/exportRankingExcel';
import { exportAdvisorsToExcel, AdvisorExportData } from '@/utils/exportAdvisorsExcel';
import { RankingTable, TipoVentaKey, tiposVentaLabels } from './RankingTable';
import { InteractiveSalesChart } from './InteractiveSalesChart';
import { useSalesCount, transformVentasForCounting } from '@/hooks/useSalesCount';
import { useSalesCountByAdvisor } from '@/hooks/useSalesCountByAdvisor';
import { useActivityCompliance } from '@/hooks/useActivityCompliance';
import { ComplianceDetailPopup } from './ComplianceDetailPopup';
import { useMetaQuantityConfig } from '@/hooks/useMetaQuantityConfig';
import { calculateMetaQuantity } from '@/utils/calculateMetaQuantity';
import { ConsultasDetailPopup } from './ConsultasDetailPopup';
import { AdvisorsAtRiskPopup } from './AdvisorsAtRiskPopup';
import { AdvisorsByTypePopup } from './AdvisorsByTypePopup';
import { AllAdvisorsPopup } from './AllAdvisorsPopup';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import { MetaTypeToggle, MetaType } from './MetaTypeToggle';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const tiposVentaColors = {
  CONTADO: 'hsl(var(--success))',
  CREDICONTADO: 'hsl(var(--warning))',
  CREDITO: 'hsl(var(--primary))',
  ALIADOS: 'hsl(var(--secondary))',
};

// Regional codes mapping: 106 PUERTO TEJADA joins 103 SANTANDER
// CALI (201) is equivalent to VALLE - handle both names/codes
const REGIONAL_CODE_MAPPING: Record<number, number[]> = {
  103: [103, 106], // SANTANDER includes PUERTO TEJADA
  201: [201],     // CALI/VALLE - same regional
};

const tipoAsesorLabels: Record<string, string> = {
  'INTERNO': 'Internos',
  'EXTERNO': 'Externos', 
  'CORRETAJE': 'Corretaje',
  'GERENCIA': 'Gerencia',
};

const tipoAsesorColors: Record<string, string> = {
  'INTERNO': 'hsl(var(--primary))',
  'EXTERNO': 'hsl(var(--success))',
  'CORRETAJE': 'hsl(var(--warning))',
  'GERENCIA': 'hsl(var(--secondary))',
};

export default function DashboardLider() {
  const { profile, role } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<TipoVentaKey[]>(['CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS']);
  const [selectedTiposAsesor, setSelectedTiposAsesor] = useState<string[]>([]);
  const [selectedRegionals, setSelectedRegionals] = useState<string[]>([]);
  const [compliancePopupOpen, setCompliancePopupOpen] = useState(false);
  const [consultasPopupOpen, setConsultasPopupOpen] = useState(false);
  const [solicitudesPopupOpen, setSolicitudesPopupOpen] = useState(false);
  const [atRiskPopupOpen, setAtRiskPopupOpen] = useState(false);
  const [allAdvisorsPopupOpen, setAllAdvisorsPopupOpen] = useState(false);
  const [selectedTypePopup, setSelectedTypePopup] = useState<string | null>(null);
  const [selectedMetaType, setSelectedMetaType] = useState<MetaType>('comercial');
  
  // Activity compliance tracking
  const { advisorSummaries, overallStats: complianceStats, isLoading: loadingCompliance } = useActivityCompliance();
  
  // Meta quantity config for Q calculations
  const { data: metaQuantityConfig } = useMetaQuantityConfig();

  // Period selector for viewing historical data
  const {
    selectedPeriod,
    periodValue,
    handlePeriodChange,
    availablePeriods,
    isLoading: isLoadingPeriods,
    dateRange,
    periodLabel,
  } = usePeriodSelector();

  // Get date range from period selector
  const startDateStr = dateRange.startDate;
  const endDateStr = dateRange.endDate;
  const currentMonth = selectedPeriod.mes;
  const currentYear = selectedPeriod.anio;

  // Determine if user is admin/coordinador (sees all data) or lider (sees regional data)
  const isGlobalRole = role === 'administrador' || role === 'coordinador_comercial' || role === 'administrativo';

  // Fetch regionales for filter
  const { data: regionales = [] } = useQuery({
    queryKey: ['regionales-dashboard'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('regionales')
        .select('*')
        .eq('activo', true)
        .order('nombre') as any);
      if (error) throw error;
      return data || [];
    },
    enabled: isGlobalRole,
  });

  // Helper: Get selected regional IDs from codes for filtering
  const selectedRegionalIds = useMemo(() => {
    if (selectedRegionals.length === 0) return new Set<string>(); // Empty = all regionales
    const ids = new Set<string>();
    selectedRegionals.forEach(code => {
      const regional = regionales.find(r => r.codigo.toString() === code);
      if (regional) {
        ids.add(regional.id);
        // Include mapped codes (e.g., 106 -> 103)
        const mappedCodes = REGIONAL_CODE_MAPPING[parseInt(code)] || [];
        mappedCodes.forEach(mc => {
          const mapped = regionales.find(r => r.codigo === mc);
          if (mapped) ids.add(mapped.id);
        });
      }
    });
    return ids;
  }, [selectedRegionals, regionales]);

  // Helper: Get all selected regional codes (including mapped) for sales filtering
  const selectedRegionalCodes = useMemo(() => {
    if (selectedRegionals.length === 0) return []; // Empty = all regionales
    const codes: number[] = [];
    selectedRegionals.forEach(code => {
      const codeNum = parseInt(code);
      codes.push(codeNum);
      // Include mapped codes
      const mappedCodes = REGIONAL_CODE_MAPPING[codeNum] || [];
      mappedCodes.forEach(mc => {
        if (!codes.includes(mc)) codes.push(mc);
      });
    });
    return codes;
  }, [selectedRegionals]);

  // Helper function to check if a profile is in the selected regional scope
  const isProfileInScope = (p: { regional_id?: string | null }) => {
    // For lider_zona, always filter by their regional
    if (role === 'lider_zona' && profile?.regional_id) {
      return p.regional_id === profile.regional_id;
    }
    // For global roles with no selection = all
    if (isGlobalRole && selectedRegionalIds.size === 0) {
      return true;
    }
    // For global roles with selection
    if (isGlobalRole && selectedRegionalIds.size > 0) {
      return p.regional_id ? selectedRegionalIds.has(p.regional_id) : false;
    }
    return true;
  };

  const { data: formasPago = [] } = useQuery({
    queryKey: ['formas-pago-dashboard'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('formas_pago')
        .select('*')
        .eq('activo', true) as any);
      if (error) throw error;
      return data || [];
    },
  });

  // First fetch the regional code for the leader
  const { data: leaderRegional, isLoading: isLoadingRegional } = useQuery({
    queryKey: ['leader-regional', profile?.regional_id],
    queryFn: async () => {
      if (!profile?.regional_id) return null;
      const { data, error } = await (dataService
        .from('regionales')
        .select('codigo, nombre')
        .eq('id', profile.regional_id)
        .maybeSingle() as any);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.regional_id && role === 'lider_zona',
  });

  // Get the list of regional codes to filter (includes mapped codes like 106->103)
  const regionalCodesToFilter = useMemo(() => {
    if (!leaderRegional?.codigo) return [];
    return REGIONAL_CODE_MAPPING[leaderRegional.codigo] || [leaderRegional.codigo];
  }, [leaderRegional?.codigo]);

  // Determine if the sales query should be enabled
  const salesQueryEnabled = useMemo(() => {
    if (isGlobalRole) return true; // Admin/Coordinador always sees everything
    if (role === 'lider_zona') return regionalCodesToFilter.length > 0;
    return !!profile;
  }, [isGlobalRole, role, regionalCodesToFilter, profile]);

  // Fetch real sales data - filter by regional for lider_zona (including mapped codes)
  // Use pagination to fetch ALL records (Supabase default limit is 1000)
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['dashboard-sales', isGlobalRole ? 'all' : regionalCodesToFilter, role, startDateStr],
    queryFn: async () => {
      type SaleRow = {
        id: string;
        fecha: string;
        tipo_venta: string | null;
        vtas_ant_i: number;
        codigo_asesor: string;
        asesor_nombre: string | null;
        cod_region: number | null;
        [key: string]: unknown;
      };
      
      const allData: SaleRow[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        let query = dataService
          .from('ventas')
          .select('*')
          .gte('fecha', startDateStr)
          .lte('fecha', endDateStr)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        // If lider_zona, filter by their regional codes (can include multiple)
        // Admin/Coordinador sees ALL data without regional filter
        if (role === 'lider_zona' && regionalCodesToFilter.length > 0) {
          query = query.in('cod_region', regionalCodesToFilter);
        }
        
        const { data, error } = await (query as any);
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as SaleRow[]));
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
    enabled: salesQueryEnabled,
  });

  // Fetch metas - for lider, could filter by their asesores
  const { data: metasData } = useQuery({
    queryKey: ['dashboard-metas', role, currentMonth, currentYear, selectedMetaType],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('metas')
        .select('*')
        .eq('mes', currentMonth)
        .eq('anio', currentYear)
        .eq('tipo_meta_categoria', selectedMetaType) as any);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for advisor names
  const { data: profiles } = useQuery({
    queryKey: ['dashboard-profiles'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('profiles')
        .select('*') as any);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch reportes diarios for consultas/solicitudes and incumplimientos
  const { data: reportesDiarios = [] } = useQuery({
    queryKey: ['reportes-diarios-dashboard', startDateStr],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('reportes_diarios')
        .select('*')
        .gte('fecha', startDateStr)
        .lte('fecha', endDateStr) as any);
      if (error) throw error;
      return data || [];
    },
  });

  // Filter reportes_diarios by regional - CRITICAL: Apply same regional filter as sales
  const filteredReportesDiarios = useMemo(() => {
    if (!reportesDiarios || !profiles) return [];
    
    // Get user_ids that belong to the current regional scope
    const regionalUserIds = new Set<string>();
    
    profiles.forEach(p => {
      if (!p.user_id) return;
      if (isProfileInScope(p)) {
        regionalUserIds.add(p.user_id);
      }
    });
    
    // Filter reports by users in the regional scope
    return reportesDiarios.filter(r => regionalUserIds.has(r.user_id));
  }, [reportesDiarios, profiles, role, profile?.regional_id, isGlobalRole, selectedRegionalIds, regionales]);

  // Consultas y solicitudes totales - using filtered data
  const totalConsultas = filteredReportesDiarios.reduce((sum, r) => sum + (r.consultas || 0), 0);
  const totalSolicitudes = filteredReportesDiarios.reduce((sum, r) => sum + (r.solicitudes || 0), 0);

  // Calculate consultas/solicitudes by advisor for popup detail - using filtered data
  const consultasByAdvisor = useMemo(() => {
    if (!profiles) return [];
    
    const advisorMap = new Map<string, {
      userId: string;
      nombre: string;
      codigo: string;
      consultas: number;
      solicitudes: number;
    }>();

    filteredReportesDiarios.forEach((r) => {
      const profileMatch = profiles.find((p) => p.user_id === r.user_id);
      if (profileMatch) {
        const existing = advisorMap.get(r.user_id);
        if (existing) {
          existing.consultas += r.consultas || 0;
          existing.solicitudes += r.solicitudes || 0;
        } else {
          advisorMap.set(r.user_id, {
            userId: r.user_id,
            nombre: profileMatch.nombre_completo,
            codigo: profileMatch.codigo_asesor || '',
            consultas: r.consultas || 0,
            solicitudes: r.solicitudes || 0,
          });
        }
      }
    });

    return Array.from(advisorMap.values());
  }, [profiles, filteredReportesDiarios]);

  // Calculate incompliance data - using filtered data by regional
  const incumplimientos = useMemo(() => {
    if (!profiles) return [];
    
    // Filter profiles by regional scope first using helper
    const regionalProfiles = profiles.filter(p => {
      if (!p.codigo_asesor) return false;
      return isProfileInScope(p);
    });
    
    const asesoresMap = new Map<string, {
      nombre: string;
      sinFoto: number;
      sinGPS: number;
      sinConsultas: number;
      diasReportados: number;
    }>();

    // Initialize with regional profiles only
    regionalProfiles.forEach((p) => {
      if (p.codigo_asesor) {
        asesoresMap.set(p.codigo_asesor, {
          nombre: p.nombre_completo,
          sinFoto: 0,
          sinGPS: 0,
          sinConsultas: 0,
          diasReportados: 0,
        });
      }
    });

    // Count incompliances from filtered reportes_diarios
    filteredReportesDiarios.forEach((r) => {
      const profileMatch = profiles.find((p) => p.user_id === r.user_id);
      if (profileMatch?.codigo_asesor) {
        const data = asesoresMap.get(profileMatch.codigo_asesor);
        if (data) {
          data.diasReportados++;
          if (!r.foto_url) data.sinFoto++;
          if (!r.gps_latitud || !r.gps_longitud) data.sinGPS++;
          if ((r.consultas || 0) === 0 && (r.solicitudes || 0) === 0) data.sinConsultas++;
        }
      }
    });

    return Array.from(asesoresMap.values()).filter(
      (a) => a.sinFoto > 0 || a.sinGPS > 0 || a.sinConsultas > 0
    );
  }, [profiles, filteredReportesDiarios, role, profile?.regional_id, isGlobalRole, selectedRegionalIds, regionales]);

  // Apply advanced filters to sales data
  const advancedFilteredSales = useMemo(() => {
    if (!salesData || !profiles) return [];
    
    // Exclude "OTROS" from sales totals (REBATE, ARRENDAMIENTO, etc.)
    let filtered = salesData.filter(sale => sale.tipo_venta !== 'OTROS');
    
    // Filter by regional if any are selected (global roles only)
    if (isGlobalRole && selectedRegionalCodes.length > 0) {
      filtered = filtered.filter(sale => selectedRegionalCodes.includes(sale.cod_region || 0));
    }
    
    // Filter by tipo_asesor if any types are selected
    if (selectedTiposAsesor.length > 0) {
      const normalizeCode = (code: string): string => {
        const clean = (code || '').replace(/^0+/, '').trim();
        return clean.padStart(5, '0');
      };
      
      const tipoAsesorMap = new Map<string, string>();
      profiles.forEach(p => {
        if (p.codigo_asesor) {
          const normalized = normalizeCode(p.codigo_asesor);
          tipoAsesorMap.set(normalized, (p.tipo_asesor || 'EXTERNO').toUpperCase());
        }
      });
      
      filtered = filtered.filter(sale => {
        const codigo = sale.codigo_asesor || '';
        const normalizedCode = normalizeCode(codigo);
        const nombre = (sale.asesor_nombre || '').toUpperCase();
        
        const isGerencia = codigo === '01' || normalizedCode === '00001' || 
          nombre.includes('GENERAL') || nombre.includes('GERENCIA');
        
        let tipoAsesor: string;
        if (isGerencia) {
          tipoAsesor = 'INTERNO';
        } else {
          tipoAsesor = tipoAsesorMap.get(normalizedCode) || tipoAsesorMap.get(codigo) || 'EXTERNO';
        }
        
        return selectedTiposAsesor.includes(tipoAsesor);
      });
    }
    
    return filtered;
  }, [salesData, profiles, selectedRegionalCodes, selectedTiposAsesor, isGlobalRole]);

  // Calculate metrics including sales by advisor type
  // Wait for both salesData AND profiles to be loaded for accurate calculations
  const metrics = useMemo(() => {
    if (!advancedFilteredSales || !profiles) return { total: 0, byType: [], byAdvisor: [], byAdvisorType: [], totalMeta: 0, advisorCount: 0, totalActiveAdvisors: 0, advisorsWithSales: 0 };

    // Use filtered sales
    const filteredSales = advancedFilteredSales;

    // Group by tipo_venta - use net values (SUM, not ABS) to account for returns
    const byType = Object.entries(
      filteredSales.reduce((acc, sale) => {
        const type = sale.tipo_venta || 'OTRO';
        acc[type] = (acc[type] || 0) + (sale.vtas_ant_i || 0);
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({
      name: tiposVentaLabels[name] || name,
      value: value as number, // Use net value, not abs - allows negatives for returns
      key: name,
      color: tiposVentaColors[name as TipoVentaKey] || 'hsl(var(--muted))',
    }));

    // Group by advisor with their tipo_asesor from profiles
    // Normalize codes: LPAD with zeros to match profiles format (5 digits)
    const normalizeCode = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };

    // Pre-build a map of normalized code -> tipo_asesor for fast lookup
    const tipoAsesorMap = new Map<string, string>();
    // Pre-build a map of normalized code -> regional name for fast lookup
    const regionalMap = new Map<string, string>();
    (profiles || []).forEach(p => {
      if (p.codigo_asesor) {
        const normalized = normalizeCode(p.codigo_asesor);
        tipoAsesorMap.set(normalized, (p.tipo_asesor || 'EXTERNO').toUpperCase());
        // Map regional_id to regional name
        if (p.regional_id) {
          const regional = regionales.find(r => r.id === p.regional_id);
          if (regional) {
            regionalMap.set(normalized, regional.nombre);
          }
        }
      }
    });

    // Calculate sales by tipo_asesor directly (more accurate, matches SQL logic)
    // Use the same normalization logic as the database query
    const salesByTipoAsesor: Record<string, number> = { INTERNO: 0, EXTERNO: 0, CORRETAJE: 0 };
    
    filteredSales.forEach(sale => {
      const codigo = sale.codigo_asesor || '';
      const normalizedCode = normalizeCode(codigo);
      const nombre = (sale.asesor_nombre || '').toUpperCase();
      
      // Check for GERENCIA/GENERAL entries - these count as INTERNO
      const isGerencia = codigo === '01' || normalizedCode === '00001' || 
        nombre.includes('GENERAL') || nombre.includes('GERENCIA');
      
      let tipoAsesor: string;
      if (isGerencia) {
        tipoAsesor = 'INTERNO';
      } else {
        // Try both original and normalized code for lookup
        tipoAsesor = tipoAsesorMap.get(normalizedCode) || tipoAsesorMap.get(codigo) || 'EXTERNO';
      }
      
      salesByTipoAsesor[tipoAsesor] = (salesByTipoAsesor[tipoAsesor] || 0) + (sale.vtas_ant_i || 0);
    });

    // Group sales by unique advisor (using normalized code as key for consistency)
    const byAdvisorMap = filteredSales.reduce((acc, sale) => {
      const advisorCode = sale.codigo_asesor;
      const normalizedCode = normalizeCode(advisorCode);
      const nombre = sale.asesor_nombre?.toUpperCase() || '';
      
      // Check for GERENCIA/GENERAL entries - these count as INTERNO
      const isGerencia = advisorCode === '01' || normalizedCode === '00001' || 
        nombre.includes('GENERAL') || nombre.includes('GERENCIA');
      
      // Use normalized code as key, but for GERENCIA use nombre to distinguish regionals
      const uniqueKey = isGerencia ? `GERENCIA_${sale.asesor_nombre || 'UNKNOWN'}` : normalizedCode;
      
      if (!acc[uniqueKey]) {
        // Get tipo_asesor: GERENCIA = INTERNO, else lookup in map, else EXTERNO
        let tipoAsesor: string;
        if (isGerencia) {
          tipoAsesor = 'INTERNO';
        } else {
          tipoAsesor = tipoAsesorMap.get(normalizedCode) || tipoAsesorMap.get(advisorCode) || 'EXTERNO';
        }
        
        // Get regional name from map
        const regional = regionalMap.get(normalizedCode) || regionalMap.get(advisorCode) || undefined;
        
        // CRITICAL: Use uniqueKey as codigo for GERENCIA entries to prevent duplicate React keys
        // For regular advisors, use the normalized code for consistency
        acc[uniqueKey] = { 
          codigo: isGerencia ? uniqueKey : normalizedCode, 
          nombre: sale.asesor_nombre || advisorCode,
          tipoAsesor: tipoAsesor,
          regional: regional,
          total: 0, 
          byType: {} as Record<string, number>,
          isGerencia: isGerencia
        };
      }
      acc[uniqueKey].total += sale.vtas_ant_i || 0;
      const tipo = sale.tipo_venta || 'OTRO';
      acc[uniqueKey].byType[tipo] = (acc[uniqueKey].byType[tipo] || 0) + (sale.vtas_ant_i || 0);
      return acc;
    }, {} as Record<string, { codigo: string; nombre: string; tipoAsesor: string; regional?: string; total: number; byType: Record<string, number>; isGerencia: boolean }>);

    // Sort by net sales value (not absolute) - use net values for accurate ranking
    // Also build metaByType for each advisor
    // IMPORTANT: Keep GERENCIA/GENERAL entries in the ranking so totals match "Ventas del Mes"
    // but they will be excluded from the advisor COUNT
    // Merge active profiles that have NO sales into byAdvisorMap so they appear with 0
    (profiles || []).forEach(p => {
      if (!p.activo || !p.codigo_asesor) return;
      if (p.codigo_asesor === '00001') return;
      if (!isProfileInScope(p)) return;
      
      const normalized = normalizeCode(p.codigo_asesor);
      // Only add if not already present from sales data
      if (!byAdvisorMap[normalized]) {
        const tipoAsesor = (p.tipo_asesor || 'EXTERNO').toUpperCase();
        const regional = p.regional_id ? regionales.find(r => r.id === p.regional_id)?.nombre : undefined;
        byAdvisorMap[normalized] = {
          codigo: normalized,
          nombre: p.nombre_completo || p.codigo_asesor,
          tipoAsesor,
          regional,
          total: 0,
          byType: {},
          isGerencia: false,
        };
      }
    });

    const byAdvisor = Object.values(byAdvisorMap)
      .map(a => {
        // Find all metas for this advisor and group by tipo_meta
        const advisorMetas = metasData?.filter(m => 
          normalizeCode(m.codigo_asesor) === normalizeCode(a.codigo) || 
          m.codigo_asesor === a.codigo
        ) || [];
        
        const metaByType: Record<string, number> = {};
        advisorMetas.forEach(m => {
          const tipoKey = (m.tipo_meta || 'ventas').toUpperCase();
          metaByType[tipoKey] = (metaByType[tipoKey] || 0) + m.valor_meta;
        });
        
        const totalMeta = advisorMetas.reduce((sum, m) => sum + m.valor_meta, 0);
        
        return {
          ...a,
          total: a.total,
          meta: totalMeta,
          metaByType,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Group by tipo_asesor - get COUNTS from profiles (source of truth), SALES from ventas
    // First, get actual advisor counts from profiles table
    // For lider_zona, filter by their regional_id to show only their advisors
    const profileCountsByType = (profiles || [])
      .filter(p => {
        if (!p.activo || !p.codigo_asesor) return false;
        // Exclude GERENCIA code 00001
        if (p.codigo_asesor === '00001') return false;
        return isProfileInScope(p);
      })
      .reduce((acc, p) => {
        const tipo = (p.tipo_asesor?.toUpperCase()) || 'EXTERNO';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Use the pre-calculated salesByTipoAsesor for accurate totals (calculated directly from sales)
    // Combine: counts from profiles, totals from sales
    // Only show INTERNO, EXTERNO, CORRETAJE
    const displayTypes = ['INTERNO', 'EXTERNO', 'CORRETAJE'];
    const byAdvisorType = displayTypes
      .filter(tipo => (profileCountsByType[tipo] || 0) > 0 || (salesByTipoAsesor[tipo] || 0) > 0)
      .map(tipo => ({
        tipo,
        label: tipoAsesorLabels[tipo] || tipo,
        count: profileCountsByType[tipo] || 0,
        total: salesByTipoAsesor[tipo] || 0, // Use net value, not abs
        color: tipoAsesorColors[tipo] || 'hsl(var(--muted))',
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate totalMeta - FILTER by regional/scope to avoid showing global total
    // For lider_zona: only sum metas for advisors in their regional
    // For admin/coordinador with filter: sum metas for selected regional
    const normalizeForMeta = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };
    
    const advisorCodesInScope = new Set<string>();
    (profiles || []).forEach(p => {
      if (!p.activo || !p.codigo_asesor) return;
      if (p.codigo_asesor === '00001') return;
      
      if (isProfileInScope(p)) {
        advisorCodesInScope.add(normalizeForMeta(p.codigo_asesor));
        advisorCodesInScope.add(p.codigo_asesor); // Also add original
      }
    });
    
    const totalMeta = (metasData || [])
      .filter(m => {
        const normalizedCode = normalizeForMeta(m.codigo_asesor);
        return advisorCodesInScope.has(normalizedCode) || advisorCodesInScope.has(m.codigo_asesor);
      })
      .reduce((sum, m) => sum + m.valor_meta, 0);

    // Count unique advisors with sales (excluding GERENCIA/GENERAL entries)
    const advisorsWithSales = new Set(
      byAdvisor
        .filter(a => {
          const isGerencia = a.codigo === '01' || a.codigo === '00001' || 
            a.nombre?.toUpperCase().includes('GENERAL') || a.nombre?.toUpperCase().includes('GERENCIA');
          return !isGerencia;
        })
        .map(a => a.codigo)
    );
    
    // Total active advisors from profiles (for display when sales data is low)
    // Apply same regional filter as profileCountsByType
    const totalActiveAdvisors = (profiles || []).filter(p => {
      if (!p.activo || !p.codigo_asesor) return false;
      if (p.codigo_asesor === '00001') return false;
      return isProfileInScope(p);
    }).length;

    return {
      total: byType.reduce((sum, t) => sum + t.value, 0),
      byType,
      byAdvisor,
      byAdvisorType,
      totalMeta,
      advisorCount: Math.max(advisorsWithSales.size, totalActiveAdvisors),
      advisorsWithSales: advisorsWithSales.size,
      totalActiveAdvisors,
    };
  }, [advancedFilteredSales, metasData, profiles, role, profile?.regional_id, isGlobalRole, selectedRegionalIds, regionales]);

  // Build set of advisor codes in scope for filtering metas
  const advisorCodesInScopeForMetas = useMemo(() => {
    const normalizeForMeta = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };
    
    const codes = new Set<string>();
    (profiles || []).forEach(p => {
      if (!p.activo || !p.codigo_asesor) return;
      if (p.codigo_asesor === '00001') return;
      
      if (isProfileInScope(p)) {
        codes.add(normalizeForMeta(p.codigo_asesor));
        codes.add(p.codigo_asesor);
      }
    });
    return codes;
  }, [profiles, role, profile?.regional_id, isGlobalRole, selectedRegionalIds, regionales]);

  // Calculate budget vs executed by type - FILTER by advisors in scope
  const budgetVsExecuted = useMemo(() => {
    if (!metasData || !advancedFilteredSales) return [];

    const normalizeForMeta = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };

    const tiposVenta: TipoVentaKey[] = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS'];
    
    return tiposVenta.map(tipo => {
      // Filter metas by advisors in scope
      const presupuesto = metasData
        .filter(m => {
          if (m.tipo_meta !== tipo.toLowerCase()) return false;
          const normalizedCode = normalizeForMeta(m.codigo_asesor);
          return advisorCodesInScopeForMetas.has(normalizedCode) || advisorCodesInScopeForMetas.has(m.codigo_asesor);
        })
        .reduce((sum, m) => sum + m.valor_meta, 0);
      
      const ejecutado = advancedFilteredSales
          .filter(s => s.tipo_venta === tipo)
          .reduce((sum, s) => sum + (s.vtas_ant_i || 0), 0);

      return {
        name: tiposVentaLabels[tipo],
        presupuesto: presupuesto / 1000000,
        ejecutado: ejecutado / 1000000,
      };
    });
  }, [metasData, advancedFilteredSales, advisorCodesInScopeForMetas]);

  // Calculate metas by tipo_asesor - FILTER by advisors in scope
  const metasByTipoAsesor = useMemo(() => {
    if (!metasData || !profiles) return {};
    
    // Map codigo_asesor to tipo_asesor
    const normalizeCode = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };
    
    const codigoToTipo = new Map<string, string>();
    profiles.forEach(p => {
      if (p.codigo_asesor) {
        const normalized = normalizeCode(p.codigo_asesor);
        codigoToTipo.set(normalized, (p.tipo_asesor || 'EXTERNO').toUpperCase());
        codigoToTipo.set(p.codigo_asesor, (p.tipo_asesor || 'EXTERNO').toUpperCase());
      }
    });
    
    // Sum metas by tipo_asesor - FILTER by advisors in scope
    const metasTotals: Record<string, number> = { INTERNO: 0, EXTERNO: 0, CORRETAJE: 0 };
    
    metasData.forEach(m => {
      const normalizedCode = normalizeCode(m.codigo_asesor);
      // Only include if advisor is in scope
      if (!advisorCodesInScopeForMetas.has(normalizedCode) && !advisorCodesInScopeForMetas.has(m.codigo_asesor)) {
        return;
      }
      const tipo = codigoToTipo.get(normalizedCode) || codigoToTipo.get(m.codigo_asesor) || 'EXTERNO';
      metasTotals[tipo] = (metasTotals[tipo] || 0) + m.valor_meta;
    });
    
    return metasTotals;
  }, [metasData, profiles, advisorCodesInScopeForMetas]);

  // Calculate unique sales counts using the advanced grouping logic
  const salesCountData = useSalesCount(
    transformVentasForCounting(advancedFilteredSales as Array<{
      cliente_identificacion?: string | null;
      fecha?: string | null;
      tipo_venta?: string | null;
      forma1_pago?: string | null;
      mcn_clase?: string | null;
      vtas_ant_i: number;
    }>)
  );

  // Build tipoAsesorMap for sales count by advisor
  const tipoAsesorMap = useMemo(() => {
    const map = new Map<string, string>();
    const normalizeCode = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };
    (profiles || []).forEach(p => {
      if (p.codigo_asesor) {
        const normalized = normalizeCode(p.codigo_asesor);
        map.set(normalized, (p.tipo_asesor || 'EXTERNO').toUpperCase());
      }
    });
    return map;
  }, [profiles]);

  // Calculate sales count by advisor for ranking tooltips
  const salesCountByAdvisorData = useSalesCountByAdvisor(
    advancedFilteredSales.map(v => ({
      identifica: (v as any).cliente_identificacion,
      fecha: v.fecha,
      tipo_venta: v.tipo_venta,
      forma1_pago: (v as any).forma1_pago,
      mcn_clase: (v as any).mcn_clase,
      vtas_ant_i: v.vtas_ant_i,
      codigo_asesor: v.codigo_asesor,
    })),
    tipoAsesorMap
  );

  const advisorsAtRisk = useMemo(() => {
    const dayOfMonth = new Date().getDate(); // Use actual current day
    const daysInMonth = 31;
    const projectionFactor = daysInMonth / Math.max(dayOfMonth, 1);

    return metrics.byAdvisor
      .filter(a => {
        // Exclude GERENCIA entries
        const isGerencia = a.codigo === '01' || a.codigo === '00001' || 
          a.nombre?.toUpperCase().includes('GENERAL') || a.nombre?.toUpperCase().includes('GERENCIA');
        return !isGerencia && a.meta > 0;
      })
      .map(a => ({
        ...a,
        projected: a.total * projectionFactor,
        compliance: (a.total / a.meta) * 100, // Keep as decimal for precision
        projectedCompliance: ((a.total * projectionFactor) / a.meta) * 100,
      }))
      .filter(a => a.projectedCompliance < 100)
      .sort((a, b) => a.compliance - b.compliance); // Sort by current compliance, not projected
  }, [metrics.byAdvisor]);

  // Get advisors filtered by tipo_asesor for the popup
  const advisorsBySelectedType = useMemo(() => {
    if (!selectedTypePopup) return [];
    
    const dayOfMonth = new Date().getDate();
    const daysInMonth = 31;
    const projectionFactor = daysInMonth / Math.max(dayOfMonth, 1);

    return metrics.byAdvisor
      .filter(a => {
        // Exclude GERENCIA entries
        const isGerencia = a.codigo === '01' || a.codigo === '00001' || 
          a.nombre?.toUpperCase().includes('GENERAL') || a.nombre?.toUpperCase().includes('GERENCIA');
        if (isGerencia) return false;
        
        // Filter by tipo_asesor
        const advisorTipo = (a.tipoAsesor || 'EXTERNO').toUpperCase();
        return advisorTipo === selectedTypePopup;
      })
      .map(a => ({
        ...a,
        projected: a.total * projectionFactor,
        compliance: a.meta > 0 ? (a.total / a.meta) * 100 : 0,
        projectedCompliance: a.meta > 0 ? ((a.total * projectionFactor) / a.meta) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total); // Sort by total sales descending
  }, [metrics.byAdvisor, selectedTypePopup]);

  // Filter ranking by selected types - use net values for accurate totals
  // CRITICAL: When filters are applied, we need to:
  // 1. Calculate filteredTotal based only on selected types
  // 2. Keep original byType INTACT - do NOT replace it
  // 3. The table component will show only the columns for selected filters
  const filteredRanking = useMemo(() => {
    // When no filters, return original data as-is with no modifications
    if (selectedFilters.length === 0) {
      return metrics.byAdvisor.map(advisor => ({
        ...advisor,
        filteredTotal: advisor.total
      }));
    }
    
    // When filters are active, calculate filteredTotal from only selected types
    // IMPORTANT: Keep original byType object - do not replace it
    return metrics.byAdvisor
      .map(advisor => {
        // Sum only the selected sale types for the filtered total
        const filteredTotal = selectedFilters.reduce((sum, tipo) => {
          return sum + (advisor.byType[tipo] || 0);
        }, 0);
        
        // Return new object with filteredTotal but KEEP original byType
        // The RankingTable will only display columns for selectedFilters
        return { 
          ...advisor, 
          filteredTotal
        };
      })
      .sort((a, b) => b.filteredTotal - a.filteredTotal);
  }, [metrics.byAdvisor, selectedFilters]);

  // Calculate total for ranking
  const rankingTotal = useMemo(() => {
    return filteredRanking.reduce((sum, advisor) => {
      const displayTotal = selectedFilters.length > 0 
        ? (advisor as any).filteredTotal 
        : advisor.total;
      return sum + displayTotal;
    }, 0);
  }, [filteredRanking, selectedFilters]);

  // Handle Excel export
  const handleExportExcel = async () => {
    // Get regional names map
    const regionalMap = new Map<number, string>();
    regionales.forEach(r => {
      regionalMap.set(r.codigo, r.nombre);
    });

    // Build cedula map and regional UUID map from profiles
    const cedulaMap = new Map<string, string>();
    const regionalIdMap = new Map<string, string>();
    const regionalUuidMap = new Map<string, string>();
    const normalizeCode = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };
    profiles?.forEach(p => {
      if (p.codigo_asesor) {
        const normalized = normalizeCode(p.codigo_asesor);
        cedulaMap.set(p.codigo_asesor, p.cedula);
        cedulaMap.set(normalized, p.cedula);
        // Get regional name from regionales
        const regional = regionales.find(r => r.id === p.regional_id);
        if (regional) {
          regionalIdMap.set(p.codigo_asesor, regional.nombre);
          regionalIdMap.set(normalized, regional.nombre);
        }
        if (p.regional_id) {
          regionalUuidMap.set(p.codigo_asesor, p.regional_id);
          regionalUuidMap.set(normalized, p.regional_id);
        }
      }
    });

    const SALE_TYPES = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS'] as const;

    const dataForExport: RankingAdvisor[] = filteredRanking.map(advisor => {
      const tipoAsesor = advisor.tipoAsesor || 'EXTERNO';
      const advisorCode = advisor.codigo;
      const normalizedCode = normalizeCode(advisorCode);
      const regionalId = regionalUuidMap.get(normalizedCode) || regionalUuidMap.get(advisorCode) || '';
      
      // Get quantity data from salesCountByAdvisorData
      const advisorQtyData = salesCountByAdvisorData.byAdvisor[advisorCode] || 
                             salesCountByAdvisorData.byAdvisor[normalizedCode] || { byType: {} };
      const qtyByType: Record<string, number> = {};
      const metaQtyByType: Record<string, number> = {};
      
      SALE_TYPES.forEach(tipo => {
        // Get executed quantity
        qtyByType[tipo] = advisorQtyData.byType[tipo]?.count || 0;
        
        // Calculate meta quantity using formula
        if (metaQuantityConfig && regionalId) {
          const metaValue = advisor.metaByType?.[tipo] || 0;
          if (metaValue > 0) {
            const result = calculateMetaQuantity(metaValue, tipoAsesor, tipo, regionalId, metaQuantityConfig);
            metaQtyByType[tipo] = result.cantidadFinal;
          } else {
            metaQtyByType[tipo] = 0;
          }
        } else {
          metaQtyByType[tipo] = 0;
        }
      });

      const totalQty = Object.values(qtyByType).reduce((sum, val) => sum + val, 0);

      return {
        codigo: advisorCode,
        nombre: advisor.nombre,
        tipoAsesor,
        cedula: cedulaMap.get(advisorCode) || cedulaMap.get(normalizedCode) || '',
        regional: regionalIdMap.get(advisorCode) || regionalIdMap.get(normalizedCode) || '',
        total: selectedFilters.length > 0 ? (advisor as any).filteredTotal : advisor.total,
        byType: advisor.byType,
        qtyByType,
        metaByType: advisor.metaByType || {},
        metaQtyByType,
        totalQty,
      };
    });

    await exportRankingToExcel({
      data: dataForExport,
      includeRegional: isGlobalRole,
      fileName: isGlobalRole ? 'ranking_general' : 'ranking_regional',
    });
  };

  // Helper to build advisor export data from metrics.byAdvisor
  const buildAdvisorExportData = (advisors: typeof metrics.byAdvisor): AdvisorExportData[] => {
    // Build cedula map from profiles
    const cedulaMap = new Map<string, string>();
    const regionalIdMap = new Map<string, string>();
    const regionalUuidMap = new Map<string, string>(); // Map advisor code to regional UUID
    profiles?.forEach(p => {
      if (p.codigo_asesor) {
        const normalizeCode = (code: string): string => {
          const clean = (code || '').replace(/^0+/, '').trim();
          return clean.padStart(5, '0');
        };
        const normalized = normalizeCode(p.codigo_asesor);
        cedulaMap.set(normalized, p.cedula);
        cedulaMap.set(p.codigo_asesor, p.cedula);
        // Get regional name from regionales
        const regional = regionales.find(r => r.id === p.regional_id);
        if (regional) {
          regionalIdMap.set(normalized, regional.nombre);
          regionalIdMap.set(p.codigo_asesor, regional.nombre);
        }
        if (p.regional_id) {
          regionalUuidMap.set(normalized, p.regional_id);
          regionalUuidMap.set(p.codigo_asesor, p.regional_id);
        }
      }
    });

    const SALE_TYPES = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS'] as const;

    return advisors
      .filter(a => {
        // Exclude GERENCIA entries
        const isGerencia = a.codigo === '01' || a.codigo === '00001' || 
          a.nombre?.toUpperCase().includes('GENERAL') || a.nombre?.toUpperCase().includes('GERENCIA');
        return !isGerencia;
      })
      .map(advisor => {
        const tipoAsesor = advisor.tipoAsesor || 'EXTERNO';
        const regionalId = regionalUuidMap.get(advisor.codigo) || '';
        
        // Calculate quantity data from salesCountByAdvisorData
        const advisorQtyData = salesCountByAdvisorData.byAdvisor[advisor.codigo] || { byType: {} };
        const qtyByType: Record<string, number> = {};
        const metaQtyByType: Record<string, number> = {};
        
        SALE_TYPES.forEach(tipo => {
          // Get executed quantity
          qtyByType[tipo] = advisorQtyData.byType[tipo]?.count || 0;
          
          // Calculate meta quantity using formula
          if (metaQuantityConfig && regionalId) {
            const metaValue = advisor.metaByType?.[tipo] || 0;
            if (metaValue > 0) {
              const result = calculateMetaQuantity(metaValue, tipoAsesor, tipo, regionalId, metaQuantityConfig);
              metaQtyByType[tipo] = result.cantidadFinal;
            } else {
              metaQtyByType[tipo] = 0;
            }
          } else {
            metaQtyByType[tipo] = 0;
          }
        });

        return {
          cedula: cedulaMap.get(advisor.codigo) || '',
          codigoAsesor: advisor.codigo,
          nombre: advisor.nombre,
          tipoAsesor,
          regional: regionalIdMap.get(advisor.codigo) || advisor.regional || '',
          byType: advisor.byType,
          metaByType: advisor.metaByType || {},
          qtyByType,
          metaQtyByType,
        };
      });
  };

  // Handle export all active advisors
  const handleExportAllAdvisors = async () => {
    const data = buildAdvisorExportData(metrics.byAdvisor);
    await exportAdvisorsToExcel({
      data,
      includeRegional: isGlobalRole,
      fileName: 'asesores_activos',
      title: 'Asesores Activos',
    });
  };

  // Handle export advisors at risk
  const handleExportAtRisk = async () => {
    const data = buildAdvisorExportData(advisorsAtRisk);
    await exportAdvisorsToExcel({
      data,
      includeRegional: isGlobalRole,
      fileName: 'asesores_en_riesgo',
      title: 'Asesores en Riesgo',
    });
  };

  // Handle export advisors by type
  const handleExportByType = async (tipoAsesor: string) => {
    const data = buildAdvisorExportData(advisorsBySelectedType);
    await exportAdvisorsToExcel({
      data,
      includeRegional: isGlobalRole,
      fileName: `asesores_${tipoAsesor.toLowerCase()}`,
      title: `Asesores ${tipoAsesorLabels[tipoAsesor] || tipoAsesor}`,
    });
  };

  const toggleFilter = (tipo: TipoVentaKey) => {
    setSelectedFilters(prev => 
      prev.includes(tipo) 
        ? prev.filter(t => t !== tipo)
        : [...prev, tipo]
    );
  };

  const compliance = metrics.totalMeta > 0 
    ? Math.round((metrics.total / metrics.totalMeta) * 100) 
    : 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              ¡Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {role && roleLabels[role]} • <span className="hidden sm:inline">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="sm:hidden">{new Date().toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}</span>
            </p>
          </div>
          
          {/* Period Selector */}
          <PeriodSelector
            value={periodValue}
            onChange={handlePeriodChange}
            periods={availablePeriods}
            isLoading={isLoadingPeriods}
          />
        </div>
        
        {/* Advanced Filters - Only for global roles */}
        {isGlobalRole && (
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 items-center justify-center">
            <RegionalMultiSelect
              regionales={regionales}
              selectedCodes={selectedRegionals}
              onChange={setSelectedRegionals}
            />
            
            <TipoAsesorMultiSelect
              selectedTypes={selectedTiposAsesor}
              onChange={setSelectedTiposAsesor}
            />
            
            {/* Meta Type Toggle - Available for lider_zona, coordinador_comercial, administrador */}
            <MetaTypeToggle
              value={selectedMetaType}
              onChange={setSelectedMetaType}
            />
          </div>
        )}
        
        {/* Meta Type Toggle for lider_zona only (when not global role) */}
        {role === 'lider_zona' && !isGlobalRole && (
          <div className="flex justify-center">
            <MetaTypeToggle
              value={selectedMetaType}
              onChange={setSelectedMetaType}
            />
          </div>
        )}
      </motion.div>

      {/* KPI Cards - Row 1: Ventas */}
      <motion.div variants={item} className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas del Mes"
          value={formatCurrency(metrics.total)}
          subtitle={`Meta: ${formatCurrency(metrics.totalMeta)}`}
          icon={ShoppingCart}
          status={compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}
          tooltipTitle="Desglose por tipo de venta"
          tooltipItems={metrics.byType.map(t => {
            // CRITICAL: Filter metas by advisors in scope (same as budgetVsExecuted)
            const normalizeForMeta = (code: string): string => {
              const clean = (code || '').replace(/^0+/, '').trim();
              return clean.padStart(5, '0');
            };
            const tipoMeta = (metasData || [])
              .filter(m => {
                if (m.tipo_meta !== t.key.toLowerCase()) return false;
                const normalizedCode = normalizeForMeta(m.codigo_asesor);
                return advisorCodesInScopeForMetas.has(normalizedCode) || advisorCodesInScopeForMetas.has(m.codigo_asesor);
              })
              .reduce((sum, m) => sum + m.valor_meta, 0);
            const tipoCompliance = tipoMeta > 0 ? Math.round((t.value / tipoMeta) * 100) : 0;
            return {
              label: t.name,
              value: `${formatCurrency(t.value)} (${tipoCompliance}%)`,
              color: t.color,
            };
          })}
        />
        <KpiCard
          title="Q Ventas Mes"
          value={salesCountData.totalSalesCount.toString()}
          subtitle="Ventas únicas"
          icon={Hash}
          tooltipTitle="Cantidad por tipo de venta"
          tooltipItems={Object.entries(salesCountData.byType).map(([key, data]) => {
            // CRITICAL: Filter metas by advisors in scope (same as budgetVsExecuted)
            const normalizeForMeta = (code: string): string => {
              const clean = (code || '').replace(/^0+/, '').trim();
              return clean.padStart(5, '0');
            };
            const tipoMeta = (metasData || [])
              .filter(m => {
                if (m.tipo_meta !== key.toLowerCase()) return false;
                const normalizedCode = normalizeForMeta(m.codigo_asesor);
                return advisorCodesInScopeForMetas.has(normalizedCode) || advisorCodesInScopeForMetas.has(m.codigo_asesor);
              })
              .reduce((sum, m) => sum + m.valor_meta, 0);
            const tipoCompliance = tipoMeta > 0 ? Math.round((data.value / tipoMeta) * 100) : 0;
            return {
              label: tiposVentaLabels[key] || key,
              value: `${data.count} ventas (${tipoCompliance}%)`,
              color: tiposVentaColors[key as TipoVentaKey] || 'hsl(var(--muted))',
            };
          })}
        />
        <KpiCard
          title="Asesores Activos"
          value={metrics.totalActiveAdvisors.toString()}
          subtitle={`${metrics.advisorsWithSales} con ventas`}
          icon={Users}
          onClick={() => setAllAdvisorsPopupOpen(true)}
          onDownload={handleExportAllAdvisors}
        />
        <KpiCard
          title="En Riesgo"
          value={advisorsAtRisk.length.toString()}
          subtitle="No proyectan cumplir"
          icon={AlertTriangle}
          status={advisorsAtRisk.length > 3 ? 'danger' : advisorsAtRisk.length > 0 ? 'warning' : 'success'}
          onClick={() => setAtRiskPopupOpen(true)}
          onDownload={handleExportAtRisk}
        />
      </motion.div>

      {/* All Advisors Popup */}
      <AllAdvisorsPopup
        open={allAdvisorsPopupOpen}
        onOpenChange={setAllAdvisorsPopupOpen}
        advisors={metrics.byAdvisor}
        showRegional={isGlobalRole}
        onDownload={handleExportAllAdvisors}
      />

      {/* Advisors at Risk Popup */}
      <AdvisorsAtRiskPopup
        open={atRiskPopupOpen}
        onOpenChange={setAtRiskPopupOpen}
        advisorsAtRisk={advisorsAtRisk}
        title="Asesores en Riesgo"
        showRegional={isGlobalRole}
        onDownload={handleExportAtRisk}
      />

      {/* KPI Cards - Row 2: Cumplimiento y actividad */}
      <motion.div variants={item} className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Cumplimiento"
          value={`${compliance}%`}
          subtitle={`${100 - compliance}% para meta`}
          icon={Target}
          status={compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}
          tooltipTitle="Cumplimiento por tipo de venta"
          tooltipItems={metrics.byType.map(t => {
            // CRITICAL: Filter metas by advisors in scope (same as budgetVsExecuted)
            const normalizeForMeta = (code: string): string => {
              const clean = (code || '').replace(/^0+/, '').trim();
              return clean.padStart(5, '0');
            };
            const tipoMeta = (metasData || [])
              .filter(m => {
                if (m.tipo_meta !== t.key.toLowerCase()) return false;
                const normalizedCode = normalizeForMeta(m.codigo_asesor);
                return advisorCodesInScopeForMetas.has(normalizedCode) || advisorCodesInScopeForMetas.has(m.codigo_asesor);
              })
              .reduce((sum, m) => sum + m.valor_meta, 0);
            const tipoCompliance = tipoMeta > 0 ? Math.round((t.value / tipoMeta) * 100) : 0;
            return {
              label: t.name,
              value: `${tipoCompliance}%`,
              color: t.color,
            };
          })}
        />
        <KpiCard
          title="Consultas"
          value={totalConsultas.toString()}
          subtitle={`${consultasByAdvisor.filter(a => a.consultas > 0).length} asesores`}
          icon={MessageSquare}
          onClick={() => setConsultasPopupOpen(true)}
        />
        <KpiCard
          title="Solicitudes"
          value={totalSolicitudes.toString()}
          subtitle={`${consultasByAdvisor.filter(a => a.solicitudes > 0).length} asesores`}
          icon={FileText}
          onClick={() => setSolicitudesPopupOpen(true)}
        />
        <KpiCard
          title="Incumplimientos"
          value={complianceStats.missing_evidence.toString()}
          subtitle={`${complianceStats.compliance_rate}% cumplimiento evidencias`}
          icon={AlertCircle}
          status={complianceStats.missing_evidence > 5 ? 'danger' : complianceStats.missing_evidence > 0 ? 'warning' : 'success'}
          onClick={() => setCompliancePopupOpen(true)}
        />
      </motion.div>

      {/* Compliance Detail Popup */}
      <ComplianceDetailPopup
        open={compliancePopupOpen}
        onOpenChange={setCompliancePopupOpen}
        advisorSummaries={advisorSummaries}
        month={new Date(2026, 0, 1)}
      />

      {/* Consultas Detail Popup */}
      <ConsultasDetailPopup
        open={consultasPopupOpen}
        onOpenChange={setConsultasPopupOpen}
        advisorData={consultasByAdvisor}
        title="Consultas por Asesor"
        type="consultas"
        total={totalConsultas}
      />

      {/* Solicitudes Detail Popup */}
      <ConsultasDetailPopup
        open={solicitudesPopupOpen}
        onOpenChange={setSolicitudesPopupOpen}
        advisorData={consultasByAdvisor}
        title="Solicitudes por Asesor"
        type="solicitudes"
        total={totalSolicitudes}
      />

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Interactive Pie Chart with Breakdown */}
        <InteractiveSalesChart
          salesByType={metrics.byType}
          salesData={advancedFilteredSales}
          formasPago={formasPago}
          salesCountByType={salesCountData.byType}
        />

        {/* Budget vs Executed */}
        <Card className="card-elevated">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
              Presupuesto vs Ejecutado
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Comparativo (en millones)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsExecuted} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-[10px] sm:text-xs" tickFormatter={(v) => `$${v}M`} domain={[(dataMin: number) => dataMin < 0 ? Math.floor(dataMin / 5) * 5 : 0, 'auto']} tickCount={7} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={70} className="text-[10px] sm:text-xs" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string, props: { payload?: { presupuesto?: number; ejecutado?: number } }) => {
                      if (name === 'Ejecutado' && props.payload?.presupuesto) {
                        const compliance = props.payload.presupuesto > 0 
                          ? Math.round((value / props.payload.presupuesto) * 100) 
                          : 0;
                        return [`$${value.toFixed(1)}M (${compliance}%)`, name];
                      }
                      return [`$${value.toFixed(1)}M`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="presupuesto" name="Presupuesto" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="ejecutado" name="Ejecutado" radius={[0, 4, 4, 0]}>
                    {budgetVsExecuted.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.ejecutado < 0 ? 'hsl(var(--danger))' : 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sales by Advisor Type */}
      <motion.div variants={item}>
        <Card className="card-elevated">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
              Ventas por Tipo de Asesor
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Distribución según clasificación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.byAdvisorType.map((tipo) => {
                const salesCountForType = salesCountByAdvisorData.byTipoAsesor[tipo.tipo] || { count: 0, value: 0 };
                const metaForType = metasByTipoAsesor[tipo.tipo] || 0;
                const complianceForType = metaForType > 0 ? Math.round((tipo.total / metaForType) * 100) : 0;
                
                return (
                  <div
                    key={tipo.tipo}
                    className="p-3 sm:p-4 rounded-lg border group cursor-pointer hover:bg-muted/30 transition-colors hover:ring-1 hover:ring-primary/30"
                    style={{ borderLeftColor: tipo.color, borderLeftWidth: 4 }}
                    title={`Click para ver asesores ${tipo.label}`}
                    onClick={() => setSelectedTypePopup(tipo.tipo)}
                  >
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className="text-xs sm:text-sm font-medium text-foreground">{tipo.label}</span>
                      <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-muted text-muted-foreground">
                        {tipo.count} asesores
                      </span>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-foreground">{formatCurrency(tipo.total)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs sm:text-sm font-medium text-primary">
                        {salesCountForType.count} {salesCountForType.count === 1 ? 'venta' : 'ventas'}
                      </p>
                      <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        metaForType > 0
                          ? complianceForType >= 100 ? 'bg-success/10 text-success' :
                            complianceForType >= 80 ? 'bg-warning/10 text-warning' :
                            'bg-danger/10 text-danger'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {metaForType > 0 ? `${complianceForType}%` : '-%'}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Meta: {metaForType > 0 ? formatCurrency(metaForType) : 'Sin definir'}
                    </p>
                    <div className="mt-1.5 sm:mt-2 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ 
                          width: `${Math.min((tipo.total / metrics.total) * 100, 100)}%`,
                          backgroundColor: tipo.color,
                        }}
                      />
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      {((tipo.total / metrics.total) * 100).toFixed(1)}% del total
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Advisors by Type Popup */}
      <AdvisorsByTypePopup
        open={!!selectedTypePopup}
        onOpenChange={(open) => !open && setSelectedTypePopup(null)}
        advisors={advisorsBySelectedType}
        tipoAsesor={selectedTypePopup || ''}
        tipoAsesorLabel={tipoAsesorLabels[selectedTypePopup || ''] || selectedTypePopup || ''}
        tipoAsesorColor={tipoAsesorColors[selectedTypePopup || ''] || 'hsl(var(--primary))'}
        showRegional={isGlobalRole}
        onDownload={selectedTypePopup ? () => handleExportByType(selectedTypePopup) : undefined}
      />

      <motion.div variants={item} className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Advisors at Risk */}
        <Card className="card-elevated overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              Asesores en Riesgo
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">No proyectan cumplir la meta</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {advisorsAtRisk.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                <p>¡Todos los asesores proyectan cumplir!</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 overflow-y-auto flex-1" style={{ maxHeight: '500px' }}>
                {advisorsAtRisk.map((advisor) => (
                  <div
                    key={advisor.codigo}
                    className="p-2 sm:p-3 rounded-lg border bg-danger/5 border-danger/20 cursor-pointer hover:bg-danger/10 transition-colors"
                    onClick={() => setAtRiskPopupOpen(true)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-xs sm:text-sm truncate">{advisor.nombre}</span>
                      <StatusBadge 
                        status={advisor.compliance < 50 ? 'danger' : 'warning'} 
                        label={`${advisor.compliance.toFixed(1)}%`} 
                        size="sm" 
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                      <span>Actual: {formatCurrency(advisor.total)}</span>
                      <span className="hidden sm:inline">Meta: {formatCurrency(advisor.meta)}</span>
                    </div>
                    <div className="mt-2 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-danger transition-all"
                        style={{ width: `${Math.min(advisor.compliance, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ranking Table - Using new component */}
        <div className="lg:col-span-2">
          <RankingTable
            ranking={filteredRanking.map(a => ({
              ...a,
              meta: a.meta,
              metaByType: a.metaByType,
              filteredTotal: (a as any).filteredTotal,
            }))}
            selectedFilters={selectedFilters}
            onToggleFilter={toggleFilter}
            onExportExcel={handleExportExcel}
            
            includeRegional={isGlobalRole}
            salesCountByAdvisor={salesCountByAdvisorData.byAdvisor}
          />
        </div>
      </motion.div>

      {/* Incompliance Table */}
      {(role === 'lider_zona' || role === 'jefe_ventas' || role === 'coordinador_comercial' || role === 'administrador') && (
        <motion.div variants={item}>
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <CardTitle>Indicadores de Incumplimiento</CardTitle>
              </div>
              <CardDescription>
                Asesores con falta de evidencia, GPS o reportes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incumplimientos.length > 0 ? (
                <div className="overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                          Asesor
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                          <div className="flex items-center justify-center gap-1">
                            <Camera className="h-4 w-4" />
                            Sin Foto
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                          <div className="flex items-center justify-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Sin GPS
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                          <div className="flex items-center justify-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            Sin Actividad
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                          Días Reportados
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {incumplimientos.map((asesor, index) => (
                        <tr
                          key={index}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-4 px-4 font-medium">{asesor.nombre}</td>
                          <td className="py-4 px-4 text-center">
                            {asesor.sinFoto > 0 ? (
                              <Badge variant="destructive">{asesor.sinFoto}</Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {asesor.sinGPS > 0 ? (
                              <Badge variant="destructive">{asesor.sinGPS}</Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {asesor.sinConsultas > 0 ? (
                              <Badge variant="destructive">{asesor.sinConsultas}</Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center text-muted-foreground">
                            {asesor.diasReportados}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay incumplimientos registrados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
