import { EnquiryStatus, STATUS_COLORS } from '@/types/crm';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: EnquiryStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status];
  
  return (
    <span 
      className={cn(
        'status-badge',
        colorClass,
        size === 'sm' && 'text-[10px] px-2 py-0.5'
      )}
    >
      {status.replace(/([A-Z])/g, ' $1').trim()}
    </span>
  );
}
