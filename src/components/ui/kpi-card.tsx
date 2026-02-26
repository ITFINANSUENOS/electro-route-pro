import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, Download } from 'lucide-react';
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
  onDownload?: () => void;
}

const KpiCardInner = React.forwardRef<HTMLDivElement, KpiCardProps & { [key: string]: any }>(
  function KpiCardInner(
    { title, value, subtitle, icon: Icon, trend, status, className, onClick, onDownload, tooltipItems, tooltipTitle, ...rest },
    ref,
  ) {
    const statusColors = {
      success: 'border-l-4 border-l-success',
      warning: 'border-l-4 border-l-warning',
      danger: 'border-l-4 border-l-danger',
    };

    const handleDownload = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDownload?.();
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        onClick={onClick}
        {...rest}
        className={cn(
          'kpi-card overflow-hidden relative',
          status && statusColors[status],
          (tooltipItems || onClick) && 'cursor-pointer',
          className,
        )}
      >
        {onDownload && (
          <button
            onClick={handleDownload}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
            title="Descargar Excel"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex items-start justify-between gap-1 sm:gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground leading-tight">{title}</p>
            <p className="text-base sm:text-xl md:text-2xl font-bold text-foreground truncate">{value}</p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className={cn('rounded-lg bg-accent p-1 sm:p-2 flex-shrink-0', onDownload && 'mr-6')}>
              <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-accent-foreground" />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                'text-xs sm:text-sm font-medium',
                trend.value >= 0 ? 'text-success' : 'text-danger',
              )}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}%
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground truncate">{trend.label}</span>
          </div>
        )}
      </motion.div>
    );
  },
);

export function KpiCard(props: KpiCardProps) {
  const { tooltipItems, tooltipTitle } = props;

  if (tooltipItems && tooltipItems.length > 0) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <KpiCardInner {...props} />
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

  return <KpiCardInner {...props} />;
}
