import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'
import { getPlanStatus } from '@/lib/subscription'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Recurring Invoices — BillCraft AI' }

const FREQ_LABEL: Record<string, string> = {
  weekly:    'Weekly',
  biweekly:  'Every 2 weeks',
  monthly:   'Monthly',
  quarterly: 'Quarterly',
  yearly:    'Yearly',
}

export default async function RecurringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const plan = await getPlanStatus(userRecord.organization_id, supabase)
  if (!plan.canUseRecurring) {
    return (
      <div className="p-6">
        <UpgradePrompt
          feature="Recurring Invoices"
          description="Automatically generate and send invoices on a weekly, monthly, or custom schedule. Available on Pro and Agency plans."
        />
      </div>
    )
  }

  const { data: schedulesRaw } = await supabase
    .from('recurring_invoices')
    .select('id, title, frequency, next_issue_date, currency, is_active, total_issued, last_issued_at, items, clients(name)')
    .eq('organization_id', userRecord.organization_id)
    .is('deleted_at', null)
    .order('is_active', { ascending: false })
    .order('next_issue_date', { ascending: true })

  type RecurringWithClient = { id: string; title: string | null; frequency: string; next_issue_date: string; currency: string; is_active: boolean; total_issued: number; last_issued_at: string | null; items: unknown; clients: { name: string } | null }
  const schedules = schedulesRaw as RecurringWithClient[] | null

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Schedules that auto-generate draft invoices on a set cadence.
          </p>
        </div>
        <Button asChild>
          <Link href="/recurring/new">
            <Plus className="mr-2 h-4 w-4" /> New schedule
          </Link>
        </Button>
      </div>

      {(schedules?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">No recurring schedules yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Set up a schedule to auto-generate draft invoices for retainer clients — weekly, monthly, or any cadence.
            </p>
            <Button asChild>
              <Link href="/recurring/new">
                <Plus className="mr-2 h-4 w-4" /> Create first schedule
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(schedules ?? []).map(rec => {
            const items      = Array.isArray(rec.items) ? rec.items as { quantity: number; unit_price: number }[] : []
            const subtotal   = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0)
            const clientName = rec.clients?.name ?? '—'
            const label      = rec.title || clientName

            return (
              <Link
                key={rec.id}
                href={`/recurring/${rec.id}`}
                className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{label}</p>
                      <Badge variant={rec.is_active ? 'success' : 'secondary'}>
                        {rec.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {clientName} · {FREQ_LABEL[rec.frequency] ?? rec.frequency}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Next: {formatDate(rec.next_issue_date)}</span>
                      <span>
                        Issued {rec.total_issued} time{rec.total_issued === 1 ? '' : 's'}
                      </span>
                      {rec.last_issued_at && (
                        <span>Last: {formatDate(rec.last_issued_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{formatCurrency(subtotal, rec.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {rec.currency} / {(FREQ_LABEL[rec.frequency] ?? rec.frequency).toLowerCase()}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
