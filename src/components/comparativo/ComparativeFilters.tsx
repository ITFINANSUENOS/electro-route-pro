import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { TipoAsesorMultiSelect } from '@/components/dashboard/TipoAsesorMultiSelect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, X, Filter, Building2, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ComparativeFilters as FiltersType } from '@/hooks/useComparativeData';
 
 interface ComparativeFiltersProps {
   filters: FiltersType;
   onFiltersChange: (filters: FiltersType) => void;
 }
 
 const TIPOS_VENTA = [
   { value: 'CONTADO', label: 'Contado' },
   { value: 'CREDI CONTADO', label: 'Credi Contado' },
   { value: 'CREDITO', label: 'Crédito' },
   { value: 'ALIADOS', label: 'Aliados' },
 ];
 
 export function ComparativeFilters({ filters, onFiltersChange }: ComparativeFiltersProps) {
   const { role, profile } = useAuth();
  const [tipoVentaOpen, setTipoVentaOpen] = useState(false);
  const [jefeOpen, setJefeOpen] = useState(false);
  const [asesorOpen, setAsesorOpen] = useState(false);
  const [regionalOpen, setRegionalOpen] = useState(false);
  const [jefeSearch, setJefeSearch] = useState('');
  const [asesorSearch, setAsesorSearch] = useState('');
 
   const isGlobalRole = role === 'administrador' || role === 'coordinador_comercial';
   const isLeader = role === 'lider_zona';
   const isJefe = role === 'jefe_ventas';
   const isAsesor = role === 'asesor_comercial';
 
  // Fetch regionales for global roles
  const { data: regionales } = useQuery({
    queryKey: ['regionales-filter'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('regionales')
        .select('id, codigo, nombre')
        .eq('activo', true)
        .order('nombre') as any);
      if (error) throw error;
      return data || [];
    },
    enabled: isGlobalRole,
  });

  // Fetch jefes de ventas - use jefes_ventas table but don't filter by activo
  // since the table may not be maintained; fall back to all records
  const { data: jefes } = useQuery({
    queryKey: ['jefes-ventas-filter', profile?.regional_id, isLeader],
    queryFn: async () => {
      let query = dataService
        .from('jefes_ventas')
        .select('codigo, nombre, regional_id')
        .order('nombre');

      if (isLeader && profile?.regional_id) {
        query = query.eq('regional_id', profile.regional_id);
      }

      const { data, error } = await (query as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !isAsesor && !isJefe,
  });
 
   // Fetch asesores
   const { data: asesores } = useQuery({
     queryKey: ['asesores-filter', filters.codigoJefe, profile?.regional_id, profile?.codigo_jefe, role],
     queryFn: async () => {
       let query = dataService
         .from('profiles')
         .select('codigo_asesor, nombre_completo, codigo_jefe')
         .eq('activo', true)
         .not('codigo_asesor', 'is', null)
         .neq('codigo_asesor', '00001')
         .order('nombre_completo');
 
       if (isJefe && profile?.codigo_jefe) {
         query = query.eq('codigo_jefe', profile.codigo_jefe);
       } else if (isLeader && profile?.regional_id) {
         query = query.eq('regional_id', profile.regional_id);
       }
 
       if (filters.codigoJefe) {
         query = query.eq('codigo_jefe', filters.codigoJefe);
       }
 
       const { data, error } = await (query as any);
       if (error) throw error;
       return data || [];
     },
     enabled: !isAsesor,
   });
 
   // Handlers
   const handleTipoVentaToggle = (value: string) => {
     const newTypes = filters.tipoVenta.includes(value)
       ? filters.tipoVenta.filter(t => t !== value)
       : [...filters.tipoVenta, value];
     onFiltersChange({ ...filters, tipoVenta: newTypes });
   };
 
   const handleJefeChange = (codigo: string | null) => {
     onFiltersChange({ ...filters, codigoJefe: codigo, codigosAsesor: [] });
     setJefeOpen(false);
   };
 
   const handleAsesorToggle = (codigo: string) => {
     const newCodigos = filters.codigosAsesor.includes(codigo)
       ? filters.codigosAsesor.filter(c => c !== codigo)
       : [...filters.codigosAsesor, codigo];
     onFiltersChange({ ...filters, codigosAsesor: newCodigos });
   };
 
   const clearAllFilters = () => {
     onFiltersChange({
       tipoAsesor: [],
       tipoVenta: [],
       codigoJefe: null,
       codigosAsesor: [],
       regionalIds: [],
     });
   };
 
   const hasActiveFilters = 
     filters.tipoAsesor.length > 0 ||
     filters.tipoVenta.length > 0 ||
     filters.codigoJefe !== null ||
     filters.codigosAsesor.length > 0 ||
     filters.regionalIds.length > 0;
 
  const handleRegionalToggle = (id: string) => {
    const newIds = filters.regionalIds.includes(id)
      ? filters.regionalIds.filter(r => r !== id)
      : [...filters.regionalIds, id];
    onFiltersChange({ ...filters, regionalIds: newIds });
  };

  // Filtered lists for search
  const filteredJefes = useMemo(() => {
    if (!jefes) return [];
    if (!jefeSearch.trim()) return jefes;
    const search = jefeSearch.toLowerCase();
    return jefes.filter((j: any) => j.nombre?.toLowerCase().includes(search));
  }, [jefes, jefeSearch]);

  const filteredAsesores = useMemo(() => {
    if (!asesores) return [];
    if (!asesorSearch.trim()) return asesores;
    const search = asesorSearch.toLowerCase();
    return asesores.filter((a: any) => a.nombre_completo?.toLowerCase().includes(search));
  }, [asesores, asesorSearch]);

   // Asesor only sees their own data - no filters needed
   if (isAsesor) {
     return (
       <div className="flex items-center gap-2 text-sm text-muted-foreground">
         <Filter className="h-4 w-4" />
         <span>Mostrando tus ventas personales</span>
       </div>
     );
   }
 
   return (
     <div className="flex flex-wrap items-center gap-3">
       {/* Regional Filter - Global roles only */}
      {isGlobalRole && regionales && (
        <Popover open={regionalOpen} onOpenChange={setRegionalOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-between bg-card">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {filters.regionalIds.length === 0
                    ? 'Todas las regionales'
                    : filters.regionalIds.length === 1
                    ? regionales.find(r => r.id === filters.regionalIds[0])?.nombre
                    : `${filters.regionalIds.length} regionales`}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <div className="p-2 border-b flex justify-between">
              <button
                onClick={() => onFiltersChange({ ...filters, regionalIds: regionales.map(r => r.id) })}
                className="text-xs text-primary hover:underline"
              >
                Seleccionar todas
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, regionalIds: [] })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar
              </button>
            </div>
            <div className="max-h-[200px] overflow-auto p-1">
              {regionales.map(reg => (
                <div
                  key={reg.id}
                  onClick={() => handleRegionalToggle(reg.id)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm hover:bg-accent",
                    filters.regionalIds.includes(reg.id) && "bg-accent/50"
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {filters.regionalIds.includes(reg.id) && <Check className="h-4 w-4" />}
                  </span>
                  {reg.nombre}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
       )}
 
       {/* Tipo Asesor Filter - Leaders and above */}
       {(isGlobalRole || isLeader) && (
         <TipoAsesorMultiSelect
           selectedTypes={filters.tipoAsesor}
           onChange={(types) => onFiltersChange({ ...filters, tipoAsesor: types })}
         />
       )}
 
       {/* Tipo Venta Filter */}
       <Popover open={tipoVentaOpen} onOpenChange={setTipoVentaOpen}>
         <PopoverTrigger asChild>
           <Button variant="outline" className="w-[160px] justify-between bg-card">
             <span className="truncate">
               {filters.tipoVenta.length === 0
                 ? 'Tipo de Venta'
                 : filters.tipoVenta.length === 1
                 ? TIPOS_VENTA.find(t => t.value === filters.tipoVenta[0])?.label
                 : `${filters.tipoVenta.length} tipos`}
             </span>
             <ChevronDown className="h-4 w-4 opacity-50" />
           </Button>
         </PopoverTrigger>
         <PopoverContent className="w-[200px] p-1" align="start">
           {TIPOS_VENTA.map(tipo => (
             <div
               key={tipo.value}
               onClick={() => handleTipoVentaToggle(tipo.value)}
               className={cn(
                 "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm hover:bg-accent",
                 filters.tipoVenta.includes(tipo.value) && "bg-accent/50"
               )}
             >
               <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                 {filters.tipoVenta.includes(tipo.value) && <Check className="h-4 w-4" />}
               </span>
               {tipo.label}
             </div>
           ))}
         </PopoverContent>
       </Popover>
 
       {/* Jefe de Ventas Filter - Leaders and above */}
       {(isGlobalRole || isLeader) && jefes && (
          <Popover open={jefeOpen} onOpenChange={(open) => { setJefeOpen(open); if (!open) setJefeSearch(''); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-between bg-card">
                <span className="truncate">
                  {filters.codigoJefe
                    ? jefes.find(j => j.codigo === filters.codigoJefe)?.nombre || 'Jefe'
                    : 'Jefe de Ventas'}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar jefe..."
                    value={jefeSearch}
                    onChange={(e) => setJefeSearch(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-[250px] overflow-auto p-1">
                {!jefeSearch.trim() && (
                  <div
                    onClick={() => handleJefeChange(null)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm hover:bg-accent",
                      !filters.codigoJefe && "bg-accent/50"
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {!filters.codigoJefe && <Check className="h-4 w-4" />}
                    </span>
                    Todos los jefes
                  </div>
                )}
                {filteredJefes.map(jefe => (
                  <div
                    key={jefe.codigo}
                    onClick={() => handleJefeChange(jefe.codigo)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm hover:bg-accent",
                      filters.codigoJefe === jefe.codigo && "bg-accent/50"
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {filters.codigoJefe === jefe.codigo && <Check className="h-4 w-4" />}
                    </span>
                    <span className="truncate">{jefe.nombre}</span>
                  </div>
                ))}
                {filteredJefes.length === 0 && jefeSearch.trim() && (
                  <div className="py-3 text-center text-xs text-muted-foreground">Sin resultados</div>
                )}
              </div>
            </PopoverContent>
          </Popover>
       )}
 
       {/* Asesor Multi-Select */}
       {asesores && asesores.length > 0 && (
          <Popover open={asesorOpen} onOpenChange={(open) => { setAsesorOpen(open); if (!open) setAsesorSearch(''); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-between bg-card">
                <span className="truncate">
                  {filters.codigosAsesor.length === 0
                    ? 'Asesores'
                    : `${filters.codigosAsesor.length} seleccionados`}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="p-2 border-b space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar asesor..."
                    value={asesorSearch}
                    onChange={(e) => setAsesorSearch(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => onFiltersChange({ ...filters, codigosAsesor: (asesorSearch.trim() ? filteredAsesores : asesores).map(a => a.codigo_asesor!) })}
                    className="text-xs text-primary hover:underline"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={() => onFiltersChange({ ...filters, codigosAsesor: [] })}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <div className="max-h-[250px] overflow-auto p-1">
                {filteredAsesores.map(asesor => (
                  <div
                    key={asesor.codigo_asesor}
                    onClick={() => handleAsesorToggle(asesor.codigo_asesor!)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm hover:bg-accent",
                      filters.codigosAsesor.includes(asesor.codigo_asesor!) && "bg-accent/50"
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {filters.codigosAsesor.includes(asesor.codigo_asesor!) && <Check className="h-4 w-4" />}
                    </span>
                    <span className="truncate">{asesor.nombre_completo}</span>
                  </div>
                ))}
                {filteredAsesores.length === 0 && asesorSearch.trim() && (
                  <div className="py-3 text-center text-xs text-muted-foreground">Sin resultados</div>
                )}
              </div>
            </PopoverContent>
          </Popover>
       )}
 
       {/* Clear Filters */}
       {hasActiveFilters && (
         <Button
           variant="ghost"
           size="sm"
           onClick={clearAllFilters}
           className="text-muted-foreground hover:text-foreground"
         >
           <X className="h-4 w-4 mr-1" />
           Limpiar filtros
         </Button>
       )}
     </div>
   );
 }