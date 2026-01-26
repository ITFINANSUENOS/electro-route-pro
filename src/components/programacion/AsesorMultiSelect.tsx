import { useState } from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  user_id: string;
  nombre_completo: string;
  codigo_asesor?: string | null;
  codigo_jefe?: string | null;
  regional_id?: string | null;
  tipo_asesor?: string | null;
}

interface AsesorMultiSelectProps {
  profiles: Profile[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  selectedRegional: string;
  selectedJefe: string;
  userRegionalId?: string | null;
}

export function AsesorMultiSelect({
  profiles,
  selectedUserIds,
  onChange,
  selectedRegional,
  selectedJefe,
  userRegionalId,
}: AsesorMultiSelectProps) {
  const [open, setOpen] = useState(false);

  // Filter profiles based on selected filters
  const filteredProfiles = profiles.filter((p) => {
    // Filter by regional
    if (selectedRegional !== 'todos' && p.regional_id !== selectedRegional) {
      return false;
    }
    // If no regional filter but user has a regional (lider), filter by that
    if (selectedRegional === 'todos' && userRegionalId && p.regional_id !== userRegionalId) {
      return false;
    }
    // Filter by jefe de ventas
    if (selectedJefe !== 'todos' && p.codigo_jefe !== selectedJefe) {
      return false;
    }
    return true;
  });

  const handleToggle = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredProfiles.map((p) => p.user_id);
    onChange(allIds);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedProfiles = profiles.filter((p) => selectedUserIds.includes(p.user_id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
          >
            {selectedUserIds.length === 0 ? (
              <span className="text-muted-foreground">Seleccionar asesores...</span>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{selectedUserIds.length} asesor(es) seleccionado(s)</span>
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar asesor..." />
            <div className="flex items-center gap-2 p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                Seleccionar todos ({filteredProfiles.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs"
              >
                Limpiar
              </Button>
            </div>
            <CommandList>
              <CommandEmpty>No se encontraron asesores.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[200px]">
                  {filteredProfiles.map((profile) => (
                    <CommandItem
                      key={profile.user_id}
                      value={profile.nombre_completo}
                      onSelect={() => handleToggle(profile.user_id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedUserIds.includes(profile.user_id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{profile.nombre_completo}</span>
                        {profile.tipo_asesor && (
                          <span className="text-xs text-muted-foreground">
                            {profile.tipo_asesor}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Show selected asesores as badges */}
      {selectedProfiles.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
          {selectedProfiles.map((p) => (
            <Badge
              key={p.user_id}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleToggle(p.user_id)}
            >
              {p.nombre_completo.split(' ')[0]}
              <span className="ml-1">×</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
