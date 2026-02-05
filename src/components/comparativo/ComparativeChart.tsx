 import { useMemo } from 'react';
 import {
   ComposedChart,
   Bar,
   Line,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   Legend,
   ResponsiveContainer,
 } from 'recharts';
 import { DailySalesData } from '@/hooks/useComparativeData';
 import { format } from 'date-fns';
 import { es } from 'date-fns/locale';
 
 interface ComparativeChartProps {
   data: DailySalesData[];
   metric: 'amount' | 'count';
   currentMonthLabel: string;
   previousMonthLabel: string;
 }
 
 const formatCurrency = (value: number) => {
   if (Math.abs(value) >= 1000000) {
     return `$${(value / 1000000).toFixed(1)}M`;
   }
   if (Math.abs(value) >= 1000) {
     return `$${(value / 1000).toFixed(0)}K`;
   }
   return `$${value.toLocaleString('es-CO')}`;
 };
 
 const formatTooltipValue = (value: number, metric: 'amount' | 'count') => {
   if (metric === 'amount') {
     return `$${value.toLocaleString('es-CO')}`;
   }
   return `${value} ventas`;
 };
 
 export function ComparativeChart({
   data,
   metric,
   currentMonthLabel,
   previousMonthLabel,
 }: ComparativeChartProps) {
   const chartData = useMemo(() => {
     return data.map(d => ({
       day: d.day,
       current: metric === 'amount' ? d.currentAmount : d.currentCount,
       previous: metric === 'amount' ? d.previousAmount : d.previousCount,
     }));
   }, [data, metric]);
 
   const CustomTooltip = ({ active, payload, label }: any) => {
     if (!active || !payload || !payload.length) return null;
 
     return (
       <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
         <p className="font-medium text-foreground mb-2">Día {label}</p>
         {payload.map((entry: any, index: number) => (
           <div key={index} className="flex items-center gap-2 text-sm">
             <div
               className="w-3 h-3 rounded-full"
               style={{ backgroundColor: entry.color }}
             />
             <span className="text-muted-foreground">{entry.name}:</span>
             <span className="font-medium text-foreground">
               {formatTooltipValue(entry.value, metric)}
             </span>
           </div>
         ))}
       </div>
     );
   };
 
   return (
     <div className="w-full h-[400px]">
       <ResponsiveContainer width="100%" height="100%">
         <ComposedChart
           data={chartData}
           margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
         >
           <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
           <XAxis
             dataKey="day"
             tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
             tickLine={{ stroke: 'hsl(var(--border))' }}
           />
           <YAxis
             tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
             tickLine={{ stroke: 'hsl(var(--border))' }}
             tickFormatter={metric === 'amount' ? formatCurrency : (v) => v.toString()}
           />
           <Tooltip content={<CustomTooltip />} />
           <Legend
             wrapperStyle={{ paddingTop: '20px' }}
             formatter={(value) => (
               <span className="text-foreground text-sm">{value}</span>
             )}
           />
           <Bar
             dataKey="current"
             name={currentMonthLabel}
             fill="hsl(var(--primary))"
             radius={[4, 4, 0, 0]}
             maxBarSize={30}
           />
           <Line
             type="monotone"
             dataKey="previous"
             name={previousMonthLabel}
             stroke="hsl(var(--secondary))"
             strokeWidth={2}
             dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 3 }}
             activeDot={{ r: 5, fill: 'hsl(var(--secondary))' }}
           />
         </ComposedChart>
       </ResponsiveContainer>
     </div>
   );
 }