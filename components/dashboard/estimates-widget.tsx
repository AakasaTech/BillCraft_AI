import Link from 'next/link'
import { EstimateStatusBadge } from '@/components/estimates/estimate-status-badge'
import { formatCurrency } from '@/lib/utils'
import type { EstimateStatus } from '@/types/database'

export interface EstimateWidgetItem {
  id:              string
  estimate_number: string
  client_name:     string
  total:           number
  currency:        string
  status:          EstimateStatus
}

interface EstimatesWidgetProps {
  pending:   number
  accepted:  number
  declined:  number
  estimates: EstimateWidgetItem[]
}

export function EstimatesWidget({ pending, accepted, declined, estimates }: EstimatesWidgetProps) {
  const total       = accepted + declined
  const acceptRate  = total > 0 ? Math.round((accepted / total) * 100) : null

  if (estimates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <p className="text-sm text-muted-foreground">No estimates yet.</p>
        <Link href="/estimates/new" className="text-xs font-medium text-primary hover:underline">
          Create your first estimate →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{pending}</p>
          <p className="text-xs text-amber-600">Pending</p>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
          <p className="text-lg font-bold text-green-700">{accepted}</p>
          <p className="text-xs text-green-600">Accepted</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-lg font-bold">{acceptRate !== null ? `${acceptRate}%` : '—'}</p>
          <p className="text-xs text-muted-foreground">Accept rate</p>
        </div>
      </div>

      {/* Recent estimates */}
      <div className="divide-y">
        {estimates.map(est => (
          <Link
            key={est.id}
            href={`/estimates/${est.id}`}
            className="flex items-center justify-between py-3 transition-colors hover:text-primary"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{est.estimate_number}</span>
                <EstimateStatusBadge status={est.status} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{est.client_name}</p>
            </div>
            <span className="ml-3 shrink-0 text-sm font-semibold">
              {formatCurrency(est.total, est.currency)}
            </span>
          </Link>
        ))}
      </div>

      <Link href="/estimates" className="block text-center text-xs font-medium text-primary hover:underline">
        View all estimates →
      </Link>
    </div>
  )
}
