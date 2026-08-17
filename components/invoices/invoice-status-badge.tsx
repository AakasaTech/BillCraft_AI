import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus } from '@/types/database'

const config: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  draft:            { label: 'Draft',             variant: 'secondary'   },
  pending_approval: { label: 'Pending approval',  variant: 'warning'     },
  sent:      { label: 'Sent',      variant: 'default'     },
  viewed:    { label: 'Viewed',    variant: 'info'        },
  partial:   { label: 'Partial',   variant: 'warning'     },
  paid:      { label: 'Paid',      variant: 'success'     },
  overdue:   { label: 'Overdue',   variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline'     },
  void:      { label: 'Void',      variant: 'outline'     },
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const c = config[status as InvoiceStatus] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={c.variant}>{c.label}</Badge>
}
