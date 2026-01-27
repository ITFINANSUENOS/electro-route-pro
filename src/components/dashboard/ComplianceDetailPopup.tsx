import { useState, useMemo } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  AlertCircle, 
  Camera, 
  MapPin, 
  FileText, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  User,
  Calendar,
  Filter,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AdvisorComplianceSummary, AdvisorComplianceIssue } from '@/hooks/useActivityCompliance';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ComplianceDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorSummaries: AdvisorComplianceSummary[];
  title?: string;
  month?: Date;
}

type FilterType = 'all' | 'missing_evidence' | 'missing_photo' | 'missing_gps' | 'missing_consultas';

const filterLabels: Record<FilterType, string> = {
  all: 'Todos',
  missing_evidence: 'Sin Evidencia',
  missing_photo: 'Sin Foto',
  missing_gps: 'Sin GPS',
  missing_consultas: 'Sin Consultas',
};

const filterIcons: Record<FilterType, React.ReactNode> = {
  all: <AlertCircle className="h-4 w-4" />,
  missing_evidence: <XCircle className="h-4 w-4" />,
  missing_photo: <Camera className="h-4 w-4" />,
  missing_gps: <MapPin className="h-4 w-4" />,
  missing_consultas: <FileText className="h-4 w-4" />,
};

interface DailyStatus {
  date: Date;
  dateStr: string;
  hasActivity: boolean;
  issues: AdvisorComplianceIssue[];
  isComplete: boolean;
}

function AdvisorDetailCard({ 
  summary, 
  filter,
  month 
}: { 
  summary: AdvisorComplianceSummary; 
  filter: FilterType;
  month: Date;
}) {
  const [expanded, setExpanded] = useState(false);

  // Filter issues based on selected filter
  const filteredIssues = useMemo(() => {
    if (filter === 'all') return summary.issues;
    return summary.issues.filter(issue => issue.issue_type === filter);
  }, [summary.issues, filter]);

  // Group issues by date
  const issuesByDate = useMemo(() => {
    return filteredIssues.reduce((acc, issue) => {
      const date = issue.fecha;
      if (!acc[date]) acc[date] = [];
      acc[date].push(issue);
      return acc;
    }, {} as Record<string, AdvisorComplianceIssue[]>);
  }, [filteredIssues]);

  // Build daily status for the month (for calendar view)
  const dailyStatuses: DailyStatus[] = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const today = new Date();
    const effectiveEnd = monthEnd > today ? today : monthEnd;
    
    const days = eachDayOfInterval({ start: monthStart, end: effectiveEnd });
    
    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayIssues = summary.issues.filter(i => i.fecha === dateStr);
      
      return {
        date,
        dateStr,
        hasActivity: dayIssues.length > 0 || summary.issues.some(i => i.fecha === dateStr),
        issues: dayIssues,
        isComplete: dayIssues.length === 0,
      };
    });
  }, [month, summary.issues]);

  // Count issues by type
  const issueCounts = useMemo(() => {
    return {
      missing_evidence: summary.issues.filter(i => i.issue_type === 'missing_evidence').length,
      missing_photo: summary.issues.filter(i => i.issue_type === 'missing_photo').length,
      missing_gps: summary.issues.filter(i => i.issue_type === 'missing_gps').length,
      missing_consultas: summary.issues.filter(i => i.issue_type === 'missing_consultas').length,
    };
  }, [summary.issues]);

  if (filteredIssues.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div
        className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
            <User className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-sm">{summary.user_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{filteredIssues.length} incumplimiento{filteredIssues.length !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>{summary.total_activities} actividades programadas</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Issue type badges */}
          <div className="hidden sm:flex items-center gap-1">
            {issueCounts.missing_evidence > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive" className="text-xs px-1.5">
                      <XCircle className="h-3 w-3 mr-1" />
                      {issueCounts.missing_evidence}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Sin reporte</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {issueCounts.missing_photo > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs px-1.5 bg-warning/20 text-warning-foreground">
                      <Camera className="h-3 w-3 mr-1" />
                      {issueCounts.missing_photo}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Sin foto</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {issueCounts.missing_gps > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs px-1.5 bg-warning/20 text-warning-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {issueCounts.missing_gps}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Sin GPS</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Badge 
            variant={summary.compliance_rate >= 80 ? 'default' : summary.compliance_rate >= 50 ? 'secondary' : 'destructive'}
            className={cn(
              summary.compliance_rate >= 80 && 'bg-success text-success-foreground',
              summary.compliance_rate < 50 && 'bg-destructive text-destructive-foreground'
            )}
          >
            {summary.compliance_rate}%
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="border-t">
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger 
                value="list" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Lista de Incumplimientos
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Calendario Mensual
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="p-3 space-y-3 m-0">
              {Object.entries(issuesByDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, issues]) => (
                <div key={date} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  {issues.map((issue, idx) => (
                    <div key={idx} className="flex items-center gap-2 pl-5 text-sm border-l-2 border-destructive/30 py-1">
                      {filterIcons[issue.issue_type as FilterType] || filterIcons.all}
                      <span className="text-foreground">
                        {issue.activity_name || issue.municipio}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {issue.tipo_actividad === 'correria' ? 'Correría' : 'Punto Fijo'}
                      </Badge>
                      <span className="text-destructive text-xs ml-auto font-medium">
                        {issue.issue_label}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="calendar" className="p-3 m-0">
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <div key={i} className="font-medium text-muted-foreground py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {/* Add empty cells for days before the first of month */}
                {Array.from({ length: (startOfMonth(month).getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {dailyStatuses.map((status) => {
                  const hasIssues = status.issues.length > 0;
                  const dayNum = format(status.date, 'd');
                  
                  return (
                    <TooltipProvider key={status.dateStr}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "aspect-square rounded flex items-center justify-center text-xs font-medium cursor-default transition-colors",
                              hasIssues && "bg-destructive/20 text-destructive",
                              !hasIssues && status.hasActivity && "bg-success/20 text-success",
                              !status.hasActivity && "bg-muted/50 text-muted-foreground"
                            )}
                          >
                            {dayNum}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="font-medium">
                            {format(status.date, "d 'de' MMMM", { locale: es })}
                          </p>
                          {hasIssues ? (
                            <ul className="text-xs mt-1 space-y-0.5">
                              {status.issues.map((issue, i) => (
                                <li key={i} className="text-destructive">
                                  • {issue.issue_label}: {issue.activity_name || issue.municipio}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">Sin incumplimientos</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-destructive/20" />
                  <span className="text-muted-foreground">Con incumplimiento</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-success/20" />
                  <span className="text-muted-foreground">Cumplido</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-muted/50" />
                  <span className="text-muted-foreground">Sin actividad</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

export function ComplianceDetailPopup({ 
  open, 
  onOpenChange, 
  advisorSummaries, 
  title = 'Indicadores de Incumplimiento',
  month = new Date()
}: ComplianceDetailPopupProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Count total issues by type
  const totalCounts = useMemo(() => {
    const counts = {
      all: 0,
      missing_evidence: 0,
      missing_photo: 0,
      missing_gps: 0,
      missing_consultas: 0,
    };
    
    advisorSummaries.forEach(summary => {
      summary.issues.forEach(issue => {
        counts.all++;
        if (issue.issue_type in counts) {
          counts[issue.issue_type as FilterType]++;
        }
      });
    });
    
    return counts;
  }, [advisorSummaries]);

  // Filter summaries based on selected filter
  const filteredSummaries = useMemo(() => {
    if (filter === 'all') return advisorSummaries;
    
    return advisorSummaries
      .map(summary => ({
        ...summary,
        issues: summary.issues.filter(issue => issue.issue_type === filter),
      }))
      .filter(summary => summary.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length);
  }, [advisorSummaries, filter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Detalle de actividades sin evidencia completa - {format(month, "MMMM yyyy", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 pb-2 border-b">
          {(Object.keys(filterLabels) as FilterType[]).map((filterKey) => (
            <Button
              key={filterKey}
              variant={filter === filterKey ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(filterKey)}
              className={cn(
                "text-xs gap-1.5",
                filter === filterKey && filterKey !== 'all' && "bg-destructive hover:bg-destructive/90"
              )}
            >
              {filterIcons[filterKey]}
              {filterLabels[filterKey]}
              <Badge 
                variant="secondary" 
                className={cn(
                  "ml-1 text-xs px-1.5",
                  filter === filterKey && "bg-background/20 text-current"
                )}
              >
                {totalCounts[filterKey]}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-destructive/10">
            <p className="text-lg font-bold text-destructive">{totalCounts.missing_evidence}</p>
            <p className="text-xs text-muted-foreground">Sin Reporte</p>
          </div>
          <div className="p-2 rounded-lg bg-warning/10">
            <p className="text-lg font-bold text-warning">{totalCounts.missing_photo}</p>
            <p className="text-xs text-muted-foreground">Sin Foto</p>
          </div>
          <div className="p-2 rounded-lg bg-warning/10">
            <p className="text-lg font-bold text-warning">{totalCounts.missing_gps}</p>
            <p className="text-xs text-muted-foreground">Sin GPS</p>
          </div>
          <div className="p-2 rounded-lg bg-muted">
            <p className="text-lg font-bold">{totalCounts.missing_consultas}</p>
            <p className="text-xs text-muted-foreground">Sin Consultas</p>
          </div>
        </div>

        {filteredSummaries.length === 0 ? (
          <div className="py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? '¡Todos los asesores han cumplido con sus evidencias!'
                : `No hay incumplimientos de tipo "${filterLabels[filter]}"`
              }
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {filteredSummaries.map((summary) => (
                <AdvisorDetailCard 
                  key={summary.user_id} 
                  summary={summary} 
                  filter={filter}
                  month={month}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {filteredSummaries.length} asesor{filteredSummaries.length !== 1 ? 'es' : ''} con incumplimientos
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
