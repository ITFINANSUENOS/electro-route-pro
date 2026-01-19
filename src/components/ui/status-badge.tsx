import { cn } from '@/lib/utils';

type StatusType = 'success' | 'warning' | 'danger' | 'neutral';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<StatusType, { bg: string; text: string; label: string }> = {
  success: {
    bg: 'bg-success',
    text: 'text-success-foreground',
    label: 'Cumpliendo',
  },
  warning: {
    bg: 'bg-warning',
    text: 'text-warning-foreground',
    label: 'En riesgo',
  },
  danger: {
    bg: 'bg-danger',
    text: 'text-danger-foreground',
    label: 'Alto riesgo',
  },
  neutral: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    label: 'Sin datos',
  },
};

const sizeConfig = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function StatusBadge({
  status,
  label,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bg,
        config.text,
        sizeConfig[size],
        className
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      {label || config.label}
    </span>
  );
}

export function TrafficLight({ status }: { status: StatusType }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          'h-3 w-3 rounded-full',
          status === 'danger' ? 'bg-danger' : 'bg-danger/20'
        )}
      />
      <div
        className={cn(
          'h-3 w-3 rounded-full',
          status === 'warning' ? 'bg-warning' : 'bg-warning/20'
        )}
      />
      <div
        className={cn(
          'h-3 w-3 rounded-full',
          status === 'success' ? 'bg-success' : 'bg-success/20'
        )}
      />
    </div>
  );
}
