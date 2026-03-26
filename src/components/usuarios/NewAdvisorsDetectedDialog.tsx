import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DetectedAdvisor {
  codigo_asesor: string;
  cedula: string;
  nombre: string;
  num_ventas: number;
}

interface NewAdvisorsDetectedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisors: DetectedAdvisor[];
}

export default function NewAdvisorsDetectedDialog({ open, onOpenChange, advisors }: NewAdvisorsDetectedDialogProps) {
  const navigate = useNavigate();

  const handleCreateNow = () => {
    onOpenChange(false);
    navigate('/usuarios?pendientes=true');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Nuevos Asesores Detectados
          </DialogTitle>
          <DialogDescription>
            Se detectaron <strong>{advisors.length}</strong> asesor(es) en el informe de ventas que no están registrados en el sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {advisors.map((a) => (
            <div key={a.codigo_asesor} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.nombre || 'Sin nombre'}</p>
                <p className="text-xs text-muted-foreground">
                  Cédula: {a.cedula || 'N/A'} · Código: {a.codigo_asesor}
                </p>
              </div>
              <Badge variant="secondary" className="ml-2 shrink-0">
                {a.num_ventas} ventas
              </Badge>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Continuar Después
          </Button>
          <Button onClick={handleCreateNow} className="bg-orange-600 hover:bg-orange-700">
            <UserPlus className="h-4 w-4 mr-1.5" />
            Crear Ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
