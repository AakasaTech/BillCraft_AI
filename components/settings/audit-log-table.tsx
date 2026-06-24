'use client'

import { formatDate } from '@/lib/utils'
import { getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface AuditRow {
  id:          string
  entity_type: string
  entity_id:   string
  action:      string
  new_values:  unknown
  old_values:  unknown
  created_at:  string
  users:        { name: string; email: string } | null
}

const ACTION_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  create:  { label: 'Created',   variant: 'default' },
  update:  { label: 'Updated',   variant: 'secondary' },
  delete:  { label: 'Deleted',   variant: 'destructive' },
  send:    { label: 'Sent',      variant: 'default' },
  pay:     { label: 'Paid',      variant: 'default' },
  void:    { label: 'Voided',    variant: 'outline' },
  cancel:  { label: 'Cancelled', variant: 'outline' },
  restore: { label: 'Restored',  variant: 'secondary' },
  login:   { label: 'Login',     variant: 'secondary' },
  logout:  { label: 'Logout',    variant: 'outline' },
}

const ENTITY_LABEL: Record<string, string> = {
  invoice:    'Invoice',
  client:     'Client',
  member:     'Member',
  invitation: 'Invitation',
  payment:    'Payment',
  org:        'Organization',
}

function getDetail(row: AuditRow): string {
  const vals = row.new_values as Record<string, string> | null
  if (!vals) return '—'
  if (row.entity_type === 'invoice') {
    return vals.invoice_number ?? vals.status ?? '—'
  }
  if (row.entity_type === 'client') {
    return vals.name ?? '—'
  }
  if (row.entity_type === 'invitation') {
    return vals.email ? `${vals.email}${vals.role ? ` (${vals.role})` : ''}` : '—'
  }
  if (row.entity_type === 'member') {
    return 'Team member removed'
  }
  return '—'
}

export function AuditLogTable({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">When</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const badge = ACTION_BADGE[row.action]
              return (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(row.created_at, 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    {row.users ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {getInitials(row.users.name || row.users.email)}
                        </div>
                        <span className="truncate max-w-[140px]">{row.users.name || row.users.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {badge ? (
                      <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{row.action}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {ENTITY_LABEL[row.entity_type] ?? row.entity_type}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getDetail(row)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
