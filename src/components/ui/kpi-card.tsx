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
  onClick?: () => void;
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
  onClick,
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
      onClick={onClick}
      className={cn(
        'kpi-card overflow-hidden',
        status && statusColors[status],
        (tooltipItems || onClick) && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">{value}</p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-accent p-1.5 sm:p-2 flex-shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              'text-xs sm:text-sm font-medium',
              trend.value >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground truncate">{trend.label}</span>
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
