 import { Button } from '@/components/ui/button';
 import { Target } from 'lucide-react';
 
 export type MetaType = 'comercial' | 'nacional';
 
 interface MetaTypeToggleProps {
   value: MetaType;
   onChange: (value: MetaType) => void;
   disabled?: boolean;
 }
 
 export function MetaTypeToggle({ value, onChange, disabled = false }: MetaTypeToggleProps) {
   return (
    <div className="inline-flex items-center rounded-lg border bg-card p-1 gap-1">
      <Button
        variant={value === 'comercial' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('comercial')}
        disabled={disabled}
        className="h-7 px-3 text-xs gap-1.5"
      >
        <Target className="h-3 w-3" />
        Comercial
      </Button>
      <Button
        variant={value === 'nacional' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('nacional')}
        disabled={disabled}
        className="h-7 px-3 text-xs gap-1.5"
      >
        <Target className="h-3 w-3" />
        Nacional
      </Button>
    </div>
   );
 }