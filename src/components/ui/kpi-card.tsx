import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TooltipItem {
  label: string;
  value: string | number;
  color?: string;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  status?: 'success' | 'warning' | 'danger';
  className?: string;
  tooltipItems?: TooltipItem[];
  tooltipTitle?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  status,
  className,
  tooltipItems,
  tooltipTitle,
}: KpiCardProps) {
  const statusColors = {
    success: 'border-l-4 border-l-success',
    warning: 'border-l-4 border-l-warning',
    danger: 'border-l-4 border-l-danger',
  };

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        'kpi-card',
        status && statusColors[status],
        tooltipItems && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-accent p-2 sm:p-3">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              trend.value >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-sm text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </motion.div>
  );

  if (tooltipItems && tooltipItems.length > 0) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="p-3 max-w-[280px] bg-popover border shadow-lg"
            sideOffset={5}
          >
            {tooltipTitle && (
              <p className="font-semibold text-sm mb-2 text-popover-foreground">{tooltipTitle}</p>
            )}
            <div className="space-y-1.5">
              {tooltipItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    {item.color && (
                      <div 
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-medium text-popover-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}
