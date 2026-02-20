 import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, Info } from 'lucide-react';
 import { Card, CardContent } from '@/components/ui/card';
 import { ComparativeKPIs } from '@/hooks/useComparativeData';
 import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 
 interface ComparativeKPICardsProps {
   kpis: ComparativeKPIs;
   currentMonthLabel: string;
   previousMonthLabel: string;
 }
 
 const formatCurrency = (value: number) => {
   return new Intl.NumberFormat('es-CO', {
     style: 'currency',
     currency: 'COP',
     minimumFractionDigits: 0,
     maximumFractionDigits: 0,
   }).format(value);
 };
 
 export function ComparativeKPICards({
   kpis,
   currentMonthLabel,
   previousMonthLabel,
 }: ComparativeKPICardsProps) {
   const isPositiveAmount = kpis.variationPercent >= 0;
   const isPositiveCount = kpis.countVariationPercent >= 0;
  const comparisonNote = kpis.comparedDays > 0 
    ? `Comparando días 1-${kpis.comparedDays} de ambos meses` 
    : 'Sin datos del mes actual';
 
   const cards = [
     {
       title: `Ventas ${currentMonthLabel}`,
       value: formatCurrency(kpis.currentTotal),
       subtitle: `${kpis.currentCount} transacciones`,
       icon: DollarSign,
       color: 'text-primary',
       bgColor: 'bg-primary/10',
     },
     {
       title: `Ventas ${previousMonthLabel}`,
       value: formatCurrency(kpis.previousTotal),
       subtitle: `${kpis.previousCount} transacciones`,
       icon: Calendar,
       color: 'text-secondary',
       bgColor: 'bg-secondary/10',
     },
     {
       title: 'Variación Monto',
       value: `${isPositiveAmount ? '+' : ''}${kpis.variationPercent.toFixed(1)}%`,
        subtitle: isPositiveAmount ? `Incremento vs ${previousMonthLabel}` : `Decremento vs ${previousMonthLabel}`,
       icon: isPositiveAmount ? TrendingUp : TrendingDown,
       color: isPositiveAmount ? 'text-green-500' : 'text-red-500',
       bgColor: isPositiveAmount ? 'bg-green-500/10' : 'bg-red-500/10',
     },
     {
       title: 'Variación Cantidad',
       value: `${isPositiveCount ? '+' : ''}${kpis.countVariationPercent.toFixed(1)}%`,
       subtitle: `${Math.abs(kpis.currentCount - kpis.previousCount)} transacciones ${isPositiveCount ? 'más' : 'menos'}`,
       icon: ShoppingCart,
       color: isPositiveCount ? 'text-green-500' : 'text-red-500',
       bgColor: isPositiveCount ? 'bg-green-500/10' : 'bg-red-500/10',
     },
   ];
 
   return (
    <div className="space-y-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help w-fit">
              <Info className="h-3 w-3" />
              <span>{comparisonNote}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Los KPIs comparan solo los días con datos disponibles del mes actual</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1 truncate">
                      {card.title}
                    </p>
                    <p className={cn("text-xl font-bold", card.color)}>
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {card.subtitle}
                    </p>
                  </div>
                  <div className={cn("p-2 rounded-lg", card.bgColor)}>
                    <card.icon className={cn("h-5 w-5", card.color)} />
                  </div>
                 </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
     </div>
   );
 }