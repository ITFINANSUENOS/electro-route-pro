import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Camera, MapPin, FileText, XCircle, ChevronDown, ChevronUp, User } from 'lucide-react';
import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import { AdvisorComplianceSummary, AdvisorComplianceIssue } from '@/hooks/useActivityCompliance';

interface CompliancePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorSummaries: AdvisorComplianceSummary[];
  title?: string;
}

const issueIcons: Record<string, React.ReactNode> = {
  missing_evidence: <XCircle className="h-4 w-4 text-destructive" />,
  missing_photo: <Camera className="h-4 w-4 text-warning" />,
  missing_gps: <MapPin className="h-4 w-4 text-warning" />,
  missing_consultas: <FileText className="h-4 w-4 text-warning" />,
};

const issueLabels: Record<string, string> = {
  missing_evidence: 'Sin reporte',
  missing_photo: 'Falta foto',
  missing_gps: 'Falta ubicación',
  missing_consultas: 'Falta consultas',
};

function AdvisorCard({ summary }: { summary: AdvisorComplianceSummary }) {
  const [expanded, setExpanded] = useState(false);

  // Group issues by date
  const issuesByDate = summary.issues.reduce((acc, issue) => {
    const date = issue.fecha;
    if (!acc[date]) acc[date] = [];
    acc[date].push(issue);
    return acc;
  }, {} as Record<string, AdvisorComplianceIssue[]>);

  return (
    <div className="border rounded-lg overflow-hidden">
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
            <p className="text-xs text-muted-foreground">
              {summary.missing_activities} falta{summary.missing_activities !== 1 ? 's' : ''} de {summary.total_activities} actividades
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="p-3 space-y-3 border-t bg-card">
          {Object.entries(issuesByDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, issues]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {format(new Date(date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
              </p>
              {issues.map((issue, idx) => (
                <div key={idx} className="flex items-center gap-2 pl-2 text-sm">
                  {issueIcons[issue.issue_type]}
                  <span className="text-muted-foreground">
                    {issue.activity_name || issue.municipio}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {issue.tipo_actividad === 'correria' ? 'Correría' : 'Punto Fijo'}
                  </Badge>
                  <span className="text-destructive text-xs ml-auto">
                    {issue.issue_label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompliancePopup({ open, onOpenChange, advisorSummaries, title = 'Incumplimientos de Evidencia' }: CompliancePopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Asesores que no han subido evidencia completa de sus actividades programadas
          </DialogDescription>
        </DialogHeader>

        {advisorSummaries.length === 0 ? (
          <div className="py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-success" />
            </div>
            <p className="text-muted-foreground">
              ¡Todos los asesores han cumplido con sus evidencias!
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {advisorSummaries.map((summary) => (
                <AdvisorCard key={summary.user_id} summary={summary} />
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
