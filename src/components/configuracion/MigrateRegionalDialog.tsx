import { useState, useEffect } from "react";
import { dataService } from "@/services";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface Regional {
  id: string;
  nombre: string;
  codigo: number;
  zona: string | null;
  activo: boolean;
}

interface MigrateRegionalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceRegional: Regional;
  allRegionales: Regional[];
  onMigrationComplete: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function MigrateRegionalDialog({
  open,
  onOpenChange,
  sourceRegional,
  allRegionales,
  onMigrationComplete,
}: MigrateRegionalDialogProps) {
  const [targetRegionalId, setTargetRegionalId] = useState<string>("");
  const [deactivateSource, setDeactivateSource] = useState(true);
  const [filterByPeriod, setFilterByPeriod] = useState(false);
  const [filterMonth, setFilterMonth] = useState<number>(1);
  const [filterYear, setFilterYear] = useState<number>(2025);
  const [impactData, setImpactData] = useState<{ ventasCount: number; profilesCount: number } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const activeRegionales = allRegionales.filter(
    (r) => r.activo && r.id !== sourceRegional.id
  );

  const targetRegional = allRegionales.find((r) => r.id === targetRegionalId);

  // Fetch impact count when target changes
  useEffect(() => {
    if (!targetRegionalId || !open) {
      setImpactData(null);
      return;
    }

    const fetchImpact = async () => {
      setLoadingImpact(true);
      try {
        const target = allRegionales.find((r) => r.id === targetRegionalId);
        if (!target) return;

        const { data, error } = await dataService.functions.invoke("migrate-regional", {
          body: {
            sourceRegionalId: sourceRegional.id,
            targetRegionalId,
            sourceCodRegion: sourceRegional.codigo,
            targetCodRegion: target.codigo,
            deactivateSource,
            filterMonth: filterByPeriod ? filterMonth : null,
            filterYear: filterByPeriod ? filterYear : null,
            mode: "count",
          },
        });

        if (error) throw error;
        setImpactData(data as { ventasCount: number; profilesCount: number });
      } catch (error) {
        console.error("Error fetching impact:", error);
        toast.error("Error consultando impacto");
      } finally {
        setLoadingImpact(false);
      }
    };

    fetchImpact();
  }, [targetRegionalId, filterByPeriod, filterMonth, filterYear, open]);

  const handleMigrate = async () => {
    setShowConfirm(false);
    if (!targetRegional) return;

    setMigrating(true);
    try {
      const { data, error } = await dataService.functions.invoke("migrate-regional", {
        body: {
          sourceRegionalId: sourceRegional.id,
          targetRegionalId,
          sourceCodRegion: sourceRegional.codigo,
          targetCodRegion: targetRegional.codigo,
          deactivateSource,
          filterMonth: filterByPeriod ? filterMonth : null,
          filterYear: filterByPeriod ? filterYear : null,
          mode: "execute",
        },
      });

      if (error) throw error;

      const result = data as { ventasMigrated: number; profilesMigrated: number; deactivated: boolean };
      toast.success(
        `Migración completada: ${result.ventasMigrated} ventas y ${result.profilesMigrated} perfiles migrados${result.deactivated ? ". Regional desactivada." : "."}`
      );

      onOpenChange(false);
      onMigrationComplete();
    } catch (error) {
      console.error("Migration error:", error);
      toast.error((error as Error).message || "Error en la migración");
    } finally {
      setMigrating(false);
    }
  };

  const resetState = () => {
    setTargetRegionalId("");
    setDeactivateSource(true);
    setFilterByPeriod(false);
    setImpactData(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetState();
          onOpenChange(v);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Migrar Regional</DialogTitle>
            <DialogDescription>
              Reasignar datos de <strong>{sourceRegional.nombre} (Código {sourceRegional.codigo})</strong> a otra regional.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Target selector */}
            <div className="grid gap-2">
              <Label>Regional Destino *</Label>
              <Select value={targetRegionalId} onValueChange={setTargetRegionalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione regional destino" />
                </SelectTrigger>
                <SelectContent>
                  {activeRegionales.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre} ({r.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-period"
                  checked={filterByPeriod}
                  onCheckedChange={(v) => setFilterByPeriod(!!v)}
                />
                <Label htmlFor="filter-period" className="cursor-pointer">
                  Solo migrar ventas de un período específico
                </Label>
              </div>

              {filterByPeriod && (
                <div className="flex gap-2 ml-6">
                  <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(parseInt(v))}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, idx) => (
                        <SelectItem key={idx} value={String(idx + 1)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(parseInt(v))}>
                    <SelectTrigger className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Deactivate checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="deactivate"
                checked={deactivateSource}
                onCheckedChange={(v) => setDeactivateSource(!!v)}
              />
              <Label htmlFor="deactivate" className="cursor-pointer">
                Desactivar regional origen después de migrar
              </Label>
            </div>

            {/* Impact summary */}
            {targetRegionalId && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Impacto estimado:</p>
                {loadingImpact ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Calculando...</span>
                  </div>
                ) : impactData ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold">{impactData.ventasCount.toLocaleString("es-CO")}</p>
                      <p className="text-xs text-muted-foreground">
                        registros de ventas{filterByPeriod ? ` (${MONTH_NAMES[filterMonth - 1]} ${filterYear})` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{impactData.profilesCount.toLocaleString("es-CO")}</p>
                      <p className="text-xs text-muted-foreground">perfiles de asesores</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <Alert className="border-warning bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                Esta acción es irreversible. Todos los datos seleccionados serán reasignados permanentemente.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              disabled={!targetRegionalId || migrating || loadingImpact}
            >
              {migrating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Migrar Regional
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar migración?</AlertDialogTitle>
            <AlertDialogDescription>
              Se migrarán {impactData?.ventasCount || 0} registros de ventas y {impactData?.profilesCount || 0} perfiles
              de <strong>{sourceRegional.nombre}</strong> a <strong>{targetRegional?.nombre}</strong>.
              {deactivateSource && " La regional origen será desactivada."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMigrate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Migración
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
