import { useState, useEffect } from "react";
import { dataService } from "@/services";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Loader2, Info, Shield } from "lucide-react";

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

export function MigrateRegionalDialog({
  open,
  onOpenChange,
  sourceRegional,
  allRegionales,
  onMigrationComplete,
}: MigrateRegionalDialogProps) {
  const [targetRegionalId, setTargetRegionalId] = useState<string>("");
  const [deactivateSource, setDeactivateSource] = useState(true);
  const [fechaEfectiva, setFechaEfectiva] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [impactData, setImpactData] = useState<{ ventasCount: number; profilesCount: number; existingMapping: boolean } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const activeRegionales = allRegionales.filter(
    (r) => r.activo && r.id !== sourceRegional.id
  );

  const targetRegional = allRegionales.find((r) => r.id === targetRegionalId);

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
            mode: "count",
          },
        });

        if (error) throw error;
        setImpactData(data as { ventasCount: number; profilesCount: number; existingMapping: boolean });
      } catch (error) {
        console.error("Error fetching impact:", error);
        toast.error("Error consultando impacto");
      } finally {
        setLoadingImpact(false);
      }
    };

    fetchImpact();
  }, [targetRegionalId, open]);

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
          fechaEfectiva,
          notas,
          mode: "execute",
        },
      });

      if (error) throw error;

      const result = data as { ventasAffected: number; profilesAffected: number; deactivated: boolean };
      toast.success(
        `Mapeo creado: ${result.ventasAffected} ventas y ${result.profilesAffected} perfiles consolidados lógicamente${result.deactivated ? ". Regional desactivada." : "."}`
      );

      onOpenChange(false);
      onMigrationComplete();
    } catch (error) {
      console.error("Migration error:", error);
      toast.error((error as Error).message || "Error creando mapeo");
    } finally {
      setMigrating(false);
    }
  };

  const resetState = () => {
    setTargetRegionalId("");
    setDeactivateSource(true);
    setFechaEfectiva(new Date().toISOString().split("T")[0]);
    setNotas("");
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
            <DialogTitle>Consolidar Regional</DialogTitle>
            <DialogDescription>
              Crear mapeo lógico de <strong>{sourceRegional.nombre} (Código {sourceRegional.codigo})</strong> hacia otra regional. Los datos originales se preservan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
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

            <div className="grid gap-2">
              <Label>Fecha efectiva</Label>
              <Input
                type="date"
                value={fechaEfectiva}
                onChange={(e) => setFechaEfectiva(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Desde qué fecha aplica la consolidación en los reportes
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Ej: Puerto Tejada se fusiona con Santander"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="deactivate"
                checked={deactivateSource}
                onCheckedChange={(v) => setDeactivateSource(!!v)}
              />
              <Label htmlFor="deactivate" className="cursor-pointer">
                Desactivar regional origen
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
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold">{impactData.ventasCount.toLocaleString("es-CO")}</p>
                        <p className="text-xs text-muted-foreground">registros de ventas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{impactData.profilesCount.toLocaleString("es-CO")}</p>
                        <p className="text-xs text-muted-foreground">perfiles de asesores</p>
                      </div>
                    </div>
                    {impactData.existingMapping && (
                      <Alert className="border-warning bg-warning/10">
                        <Info className="h-4 w-4 text-warning" />
                        <AlertDescription className="text-sm">
                          Ya existe un mapeo activo para esta regional.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : null}
              </div>
            )}

            <Alert className="border-primary/30 bg-primary/5">
              <Shield className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong>Datos preservados:</strong> Este mapeo es lógico y reversible. Los registros originales de ventas no se modifican. Puedes desactivar el mapeo en cualquier momento.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!targetRegionalId || migrating || loadingImpact}
            >
              {migrating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Mapeo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar consolidación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará un mapeo lógico: los {impactData?.ventasCount || 0} registros de ventas de{" "}
              <strong>{sourceRegional.nombre}</strong> se consolidarán bajo{" "}
              <strong>{targetRegional?.nombre}</strong> en los reportes.
              {deactivateSource && " La regional origen será desactivada."}
              <br /><br />
              <strong>Este mapeo es reversible</strong> — puedes desactivarlo desde la gestión de mapeos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMigrate}>
              Confirmar Mapeo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
