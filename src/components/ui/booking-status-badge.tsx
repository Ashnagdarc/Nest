import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BookingStatusBadgeProps = {
  status: string;
  className?: string;
};

const normalizeStatus = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '_');

export function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
  const normalized = normalizeStatus(status || 'unknown');

  const styles: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
    approved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    checked_out: 'bg-blue-500/10 text-blue-700 border-blue-200',
    active: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
    completed: 'bg-slate-500/10 text-slate-700 border-slate-200',
    checked_in: 'bg-slate-500/10 text-slate-700 border-slate-200',
    returned: 'bg-slate-500/10 text-slate-700 border-slate-200',
    rejected: 'bg-rose-500/10 text-rose-700 border-rose-200',
    failed: 'bg-rose-500/10 text-rose-700 border-rose-200',
    cancelled: 'bg-zinc-500/10 text-zinc-700 border-zinc-200',
    overdue: 'bg-red-500/10 text-red-700 border-red-200',
  };

  const label =
    normalized === 'checked_out'
      ? 'Checked Out'
      : normalized === 'checked_in'
        ? 'Checked In'
        : normalized.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

  return (
    <Badge
      variant="outline"
      className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', styles[normalized] || 'bg-muted text-muted-foreground border-border', className)}
    >
      {label}
    </Badge>
  );
}
