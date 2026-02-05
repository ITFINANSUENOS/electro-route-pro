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
 
 interface ComparativeChartProps {
   data: DailySalesData[];
  showAmount: boolean;
  showCount: boolean;
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
 
const formatCount = (value: number) => {
  return value.toString();
 };
 
 export function ComparativeChart({
   data,
  showAmount,
  showCount,
   currentMonthLabel,
   previousMonthLabel,
 }: ComparativeChartProps) {
   const chartData = useMemo(() => {
     return data.map(d => ({
       day: d.day,
      currentAmount: d.currentAmount,
      previousAmount: d.previousAmount,
      currentCount: d.currentCount,
      previousCount: d.previousCount,
     }));
  }, [data]);
 
   const CustomTooltip = ({ active, payload, label }: any) => {
     if (!active || !payload || !payload.length) return null;
 
     return (
       <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
         <p className="font-medium text-foreground mb-2">Día {label}</p>
        {payload.map((entry: any, index: number) => {
          const isAmount = entry.dataKey.includes('Amount');
          const formattedValue = isAmount 
            ? `$${entry.value.toLocaleString('es-CO')}`
            : `${entry.value} ventas`;
          
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">
                {formattedValue}
              </span>
            </div>
          );
        })}
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
          {/* Left Y-Axis for Amount (Bars) */}
           <YAxis
            yAxisId="amount"
            orientation="left"
             tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
             tickLine={{ stroke: 'hsl(var(--border))' }}
            tickFormatter={formatCurrency}
            hide={!showAmount}
          />
          {/* Right Y-Axis for Count (Lines) */}
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            tickFormatter={formatCount}
            hide={!showCount}
           />
           <Tooltip content={<CustomTooltip />} />
           <Legend
             wrapperStyle={{ paddingTop: '20px' }}
             formatter={(value) => (
               <span className="text-foreground text-sm">{value}</span>
             )}
           />
          {/* Bars for Amount - Current Month */}
          {showAmount && (
            <Bar
              yAxisId="amount"
              dataKey="currentAmount"
              name={`${currentMonthLabel} ($)`}
              fill="hsl(var(--primary))"
              radius={[2, 2, 0, 0]}
              maxBarSize={15}
            />
          )}
          {/* Bars for Amount - Previous Month */}
          {showAmount && (
            <Bar
              yAxisId="amount"
              dataKey="previousAmount"
              name={`${previousMonthLabel} ($)`}
              fill="hsl(var(--primary)/0.4)"
              radius={[2, 2, 0, 0]}
              maxBarSize={15}
            />
          )}
          {/* Line for Count - Current Month */}
          {showCount && (
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="currentCount"
              name={`${currentMonthLabel} (Q)`}
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--secondary))' }}
            />
          )}
          {/* Line for Count - Previous Month */}
          {showCount && (
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="previousCount"
              name={`${previousMonthLabel} (Q)`}
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--accent))' }}
            />
          )}
         </ComposedChart>
       </ResponsiveContainer>
     </div>
   );
 }