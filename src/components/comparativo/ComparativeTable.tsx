 import { useMemo } from 'react';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { DailySalesData } from '@/hooks/useComparativeData';
 import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface ComparativeTableProps {
   data: DailySalesData[];
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
 
 export function ComparativeTable({
   data,
   currentMonthLabel,
   previousMonthLabel,
 }: ComparativeTableProps) {
   const tableData = useMemo(() => {
     return data.filter(d => d.currentAmount !== 0 || d.previousAmount !== 0).map(d => {
       const amountVariation = d.previousAmount !== 0
         ? ((d.currentAmount - d.previousAmount) / Math.abs(d.previousAmount)) * 100
         : d.currentAmount > 0 ? 100 : 0;
       
       const countVariation = d.previousCount !== 0
         ? ((d.currentCount - d.previousCount) / d.previousCount) * 100
         : d.currentCount > 0 ? 100 : 0;
 
       return {
         ...d,
         amountVariation,
         countVariation,
       };
     });
   }, [data]);
 
   const VariationCell = ({ value }: { value: number }) => {
     if (value === 0) {
       return (
         <div className="flex items-center gap-1 text-muted-foreground">
           <Minus className="h-3 w-3" />
           <span>0%</span>
         </div>
       );
     }
 
     const isPositive = value > 0;
     return (
       <div className={cn(
         "flex items-center gap-1",
         isPositive ? "text-green-500" : "text-red-500"
       )}>
         {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
         <span>{isPositive ? '+' : ''}{value.toFixed(1)}%</span>
       </div>
     );
   };
 
   if (tableData.length === 0) {
     return (
       <Card>
         <CardContent className="py-8 text-center text-muted-foreground">
           No hay datos para mostrar en el período seleccionado
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card>
       <CardHeader className="pb-3">
         <CardTitle className="text-lg">Detalle por Día</CardTitle>
       </CardHeader>
       <CardContent className="p-0">
         <div className="overflow-auto max-h-[400px]">
           <Table>
             <TableHeader className="sticky top-0 bg-card z-10">
               <TableRow>
                 <TableHead className="w-[60px]">Día</TableHead>
                 <TableHead className="text-right">{currentMonthLabel}</TableHead>
                 <TableHead className="text-right">{previousMonthLabel}</TableHead>
                 <TableHead className="text-right">Var. Monto</TableHead>
                 <TableHead className="text-center">Q Actual</TableHead>
                 <TableHead className="text-center">Q Anterior</TableHead>
                 <TableHead className="text-right">Var. Cant.</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {tableData.map((row) => (
                 <TableRow key={row.day}>
                   <TableCell className="font-medium">{row.day}</TableCell>
                   <TableCell className="text-right font-medium">
                     {formatCurrency(row.currentAmount)}
                   </TableCell>
                   <TableCell className="text-right text-muted-foreground">
                     {formatCurrency(row.previousAmount)}
                   </TableCell>
                   <TableCell className="text-right">
                     <VariationCell value={row.amountVariation} />
                   </TableCell>
                   <TableCell className="text-center">{row.currentCount}</TableCell>
                   <TableCell className="text-center text-muted-foreground">
                     {row.previousCount}
                   </TableCell>
                   <TableCell className="text-right">
                     <VariationCell value={row.countVariation} />
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </div>
       </CardContent>
     </Card>
   );
 }