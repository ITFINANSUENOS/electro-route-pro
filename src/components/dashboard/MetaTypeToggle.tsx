 import { Button } from '@/components/ui/button';
 import { Target } from 'lucide-react';
 import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
 } from '@/components/ui/tooltip';
 
 export type MetaType = 'comercial' | 'nacional';
 
 interface MetaTypeToggleProps {
   value: MetaType;
   onChange: (value: MetaType) => void;
   disabled?: boolean;
 }
 
 export function MetaTypeToggle({ value, onChange, disabled = false }: MetaTypeToggleProps) {
   return (
     <TooltipProvider delayDuration={200}>
       <Tooltip>
         <TooltipTrigger asChild>
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
         </TooltipTrigger>
         <TooltipContent side="bottom" className="max-w-xs">
           <p className="text-xs">
             <strong>Meta Comercial:</strong> Objetivo interno (más alto)<br/>
             <strong>Meta Nacional:</strong> Mínimo requerido
           </p>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
   );
 }