import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ChevronLeft } from 'lucide-react';
import { TipoVentaKey, tiposVentaLabels } from './RankingTable';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from 'recharts';
import { PieSectorDataItem } from 'recharts/types/polar/Pie';

interface SaleData {
  cliente_identificacion?: string | null;
  fecha?: string | null;
  forma1_pago?: string | null;
  tipo_venta?: string | null;
  mcn_clase?: string | null;
  vtas_ant_i: number;
}

interface FormaPago {
  codigo: string;
  nombre: string;
  tipo_venta: string;
  activo: boolean;
}

// Sales count by type from useSalesCount hook
interface SalesCountByType {
  count: number;
  value: number;
}

interface InteractiveSalesChartProps {
  salesByType: Array<{
    name: string;
    value: number;
    key: string;
    color: string;
    count?: number;  // Optional count of unique sales
  }>;
  salesData: SaleData[];
  formasPago: FormaPago[];
  salesCountByType?: Record<string, SalesCountByType>;  // From useSalesCount
  onTypeClick?: (tipo: TipoVentaKey) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const tiposVentaColors: Record<string, string> = {
  CONTADO: 'hsl(var(--success))',
  CREDICONTADO: 'hsl(var(--warning))',
  CREDITO: 'hsl(var(--primary))',
  CONVENIO: 'hsl(var(--secondary))',
};

const tipoVentaBadgeColors: Record<string, string> = {
  CONTADO: 'bg-success/10 text-success border-success/30',
  CREDICONTADO: 'bg-warning/10 text-warning border-warning/30',
  CREDITO: 'bg-primary/10 text-primary border-primary/30',
  CONVENIO: 'bg-secondary/10 text-secondary border-secondary/30',
};

// Color configurations for each sale type with gradient variations
const tipoVentaColorConfig: Record<string, { hue: number; saturation: number; baseLightness: number }> = {
  CONTADO: { hue: 142, saturation: 70, baseLightness: 35 },      // green
  CREDICONTADO: { hue: 38, saturation: 85, baseLightness: 40 },  // orange/yellow
  CREDITO: { hue: 262, saturation: 80, baseLightness: 45 },      // purple
  CONVENIO: { hue: 199, saturation: 75, baseLightness: 40 },     // blue
};

// Custom active shape for highlighted slice
const renderActiveShape = (props: PieSectorDataItem) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={(outerRadius || 0) + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }}
      />
    </g>
  );
};

export function InteractiveSalesChart({
  salesByType,
  salesData,
  formasPago,
  salesCountByType,
}: InteractiveSalesChartProps) {
  const [selectedType, setSelectedType] = useState<TipoVentaKey | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Enrich salesByType with counts from salesCountByType if available
  const enrichedSalesByType = useMemo(() => {
    return salesByType.map(type => ({
      ...type,
      count: salesCountByType?.[type.key]?.count || 0,
    }));
  }, [salesByType, salesCountByType]);

  // Generate gradient colors for breakdown items based on the selected type
  const generateGradientColor = (index: number, total: number, tipo: TipoVentaKey): string => {
    const config = tipoVentaColorConfig[tipo] || { hue: 200, saturation: 70, baseLightness: 40 };
    
    // Create a gradient from dark to light based on position
    // First item is darkest, last item is lightest
    const lightnessStep = total > 1 ? 45 / (total - 1) : 0;
    const lightness = config.baseLightness + (index * lightnessStep);
    
    // Slightly reduce saturation as we go lighter
    const saturationReduction = index * 3;
    const saturation = Math.max(config.saturation - saturationReduction, 40);
    
    return `hsl(${config.hue}, ${saturation}%, ${Math.min(lightness, 80)}%)`;
  };

  // Calculate breakdown by forma_pago for selected type
  const paymentBreakdown = useMemo(() => {
    if (!selectedType || !salesData || !formasPago) return [];

    // Create lookup map for payment methods
    const paymentNameMap = new Map<string, string>();
    formasPago.forEach(fp => {
      paymentNameMap.set(fp.codigo.toUpperCase(), fp.nombre);
      // Handle encoding variations
      const normalizedCodigo = fp.codigo.toUpperCase().replace(/Ñ/g, '�');
      paymentNameMap.set(normalizedCodigo, fp.nombre);
    });

    // Filter sales by selected type
    const filteredSales = salesData.filter(s => s.tipo_venta === selectedType);

    // Group by forma_pago
    const grouped = filteredSales.reduce((acc, sale) => {
      const formaPago = (sale.forma1_pago || 'DESCONOCIDO').toUpperCase();
      
      if (!acc[formaPago]) {
        const displayName = paymentNameMap.get(formaPago) || formaPago;
        acc[formaPago] = {
          codigo: formaPago,
          nombre: displayName,
          cantidad: 0,
          total: 0,
        };
      }
      
      acc[formaPago].cantidad += 1;
      acc[formaPago].total += sale.vtas_ant_i || 0;
      
      return acc;
    }, {} as Record<string, { codigo: string; nombre: string; cantidad: number; total: number }>);

    // Convert to array, calculate percentages, and sort by total (highest first)
    const items = Object.values(grouped).sort((a, b) => b.total - a.total);
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    
    return items.map((item, index) => ({
      ...item,
      percentage: totalAmount > 0 ? (item.total / totalAmount) * 100 : 0,
      color: generateGradientColor(index, items.length, selectedType),
    }));
  }, [selectedType, salesData, formasPago]);

  // Handle click on pie slice
  const handlePieClick = (data: { key?: string }, index: number) => {
    if (data.key && Object.keys(tiposVentaLabels).includes(data.key)) {
      setSelectedType(data.key as TipoVentaKey);
    }
  };

  // Handle back button
  const handleBack = () => {
    setSelectedType(null);
    setActiveIndex(undefined);
  };

  // Get total for selected type
  const selectedTypeTotal = useMemo(() => {
    if (!selectedType) return 0;
    const typeData = salesByType.find(t => t.key === selectedType);
    return typeData?.value || 0;
  }, [selectedType, salesByType]);

  // Overall total
  const overallTotal = salesByType.reduce((sum, t) => sum + t.value, 0);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedType && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0 mr-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <ShoppingCart className="h-5 w-5 text-secondary" />
            <CardTitle className="text-base sm:text-lg">
              {selectedType 
                ? `Desglose: ${tiposVentaLabels[selectedType]}`
                : 'Ventas del Equipo por Tipo'
              }
            </CardTitle>
          </div>
          {selectedType && (
            <Badge 
              variant="outline" 
              className={`${tipoVentaBadgeColors[selectedType]} text-xs`}
            >
              {formatCurrency(selectedTypeTotal)}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs sm:text-sm">
          {selectedType 
            ? 'Haz clic en el botón ← para volver'
            : 'Haz clic en un tipo para ver el desglose por forma de pago'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <AnimatePresence mode="wait">
          {!selectedType ? (
            // Main pie chart view
            <motion.div
              key="main"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="h-[280px] sm:h-[320px] flex flex-col sm:flex-row items-center"
            >
              <ResponsiveContainer width="100%" height="60%" className="sm:!w-[55%] sm:!h-full">
                <PieChart>
                  <Pie
                    data={enrichedSalesByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                    onClick={handlePieClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {enrichedSalesByType.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        className="transition-all duration-200 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number, _name: string, props: { payload?: { count?: number } }) => {
                      const count = props.payload?.count || 0;
                      return [
                        <span key="tooltip">
                          {formatCurrency(value)}
                          {count > 0 && (
                            <span className="text-muted-foreground ml-2">
                              ({count} {count === 1 ? 'venta' : 'ventas'})
                            </span>
                          )}
                        </span>,
                        'Total'
                      ];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 sm:space-y-3 flex-1 w-full sm:w-auto px-2 sm:px-0">
                {enrichedSalesByType.map((type, index) => (
                  <motion.div 
                    key={type.name} 
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer rounded-lg p-1.5 sm:p-2 hover:bg-muted/50 transition-colors"
                    onClick={() => handlePieClick({ key: type.key }, index)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: type.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs sm:text-sm text-foreground">{type.name}</span>
                      {type.count > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-2">
                          ({type.count})
                        </span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {formatCurrency(type.value)}
                    </span>
                  </motion.div>
                ))}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>Total</span>
                    <div className="text-right">
                      <span>{formatCurrency(overallTotal)}</span>
                      {Object.keys(salesCountByType || {}).length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({Object.values(salesCountByType || {}).reduce((sum, t) => sum + t.count, 0)} ventas)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            // Breakdown view
            <motion.div
              key="breakdown"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-[280px] sm:h-[320px] flex flex-col sm:flex-row items-stretch gap-4"
            >
              {/* Mini pie chart for breakdown */}
              <div className="h-[140px] sm:h-full sm:w-[45%]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={1}
                      dataKey="total"
                      nameKey="nombre"
                    >
                      {paymentBreakdown.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Breakdown list with percentages */}
              <div className="flex-1 overflow-y-auto max-h-[140px] sm:max-h-full space-y-1.5 sm:space-y-2 pr-1">
                {paymentBreakdown.length > 0 ? (
                  paymentBreakdown.map((item, index) => (
                    <motion.div
                      key={item.codigo}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{item.nombre}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {item.cantidad} {item.cantidad === 1 ? 'venta' : 'ventas'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs sm:text-sm font-semibold">
                          {item.percentage.toFixed(1)}%
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No hay datos disponibles
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
