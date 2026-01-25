import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MonthCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthName: string;
  year: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || '';
}

export default function MonthCloseDialog({
  open,
  onOpenChange,
  monthName,
  year,
  onConfirm,
  onCancel,
  isLoading = false
}: MonthCloseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            🗓️ Cierre de Período
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            ¿Este archivo es el <strong>resultado final</strong> del mes de{' '}
            <span className="font-bold text-foreground">{monthName} {year}</span>?
            <br /><br />
            Si seleccionas <strong>"Sí"</strong>, el mes se cerrará y no podrás agregar más datos a este período.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            No, continuar cargando
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading} className="bg-primary">
            {isLoading ? 'Cerrando...' : 'Sí, es el resultado final'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
