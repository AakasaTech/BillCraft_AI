import { cn } from '@/lib/utils'
import type { EstimateStatus } from '@/types/database'

const STATUS_CONFIG: Record<EstimateStatus, { label: string; className: string }> = {
  draft:             { label: 'Draft',             className: 'bg-muted text-muted-foreground' },
  pending_approval:  { label: 'Pending approval',  className: 'bg-yellow-100 text-yellow-700' },
  sent:              { label: 'Sent',              className: 'bg-blue-100 text-blue-700' },
  viewed:            { label: 'Viewed',            className: 'bg-purple-100 text-purple-700' },
  accepted:          { label: 'Accepted',          className: 'bg-green-100 text-green-700' },
  declined:          { label: 'Declined',          className: 'bg-red-100 text-red-700' },
  expired:           { label: 'Expired',           className: 'bg-orange-100 text-orange-700' },
}

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.className)}>
      {cfg.label}
    </span>
  )
}
