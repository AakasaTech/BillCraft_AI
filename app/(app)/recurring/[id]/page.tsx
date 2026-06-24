import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { RecurringForm } from '@/components/recurring/recurring-form'
import { RecurringActions } from '@/components/recurring/recurring-actions'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Edit Recurring Schedule — BillCraft AI' }

const FREQ_LABEL: Record<string, string> = {
  weekly:    'Weekly',
  biweekly:  'Every 2 weeks',
  monthly:   'Monthly',
  quarterly: 'Quarterly',
  yearly:    'Yearly',
}

export default async function RecurringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: rec }, { data: clients }, { data: org }] = await Promise.all([
    supabase
      .from('recurring_invoices')
      .select('*, clients(name)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('clients').select('id, name')
      .eq('organization_id', orgId)
      .is('deleted_at', null).eq('is_active', true).order('name'),
    supabase
      .from('organizations').select('default_currency')
      .eq('id', orgId).single(),
  ])

  if (!rec) notFound()

  const clientName = (rec.clients as { name: string } | null)?.name ?? '—'
  const label      = rec.title || clientName

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{label}</h1>
            <Badge variant={rec.is_active ? 'success' : 'secondary'}>
              {rec.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientName}
            {' · '}
            {FREQ_LABEL[rec.frequency] ?? rec.frequency}
            {' · '}
            Next issue {formatDate(rec.next_issue_date)}
            {rec.total_issued > 0 && (
              ` · Issued ${rec.total_issued} time${rec.total_issued === 1 ? '' : 's'}`
            )}
          </p>
        </div>
        <RecurringActions id={id} isActive={rec.is_active} />
      </div>

      <RecurringForm
        id={id}
        clients={clients ?? []}
        defaultCurrency={org?.default_currency ?? 'USD'}
        defaultValues={{
          client_id:            rec.client_id,
          title:                rec.title ?? '',
          frequency:            rec.frequency as any,
          next_issue_date:      rec.next_issue_date,
          due_days:             rec.due_days,
          currency:             rec.currency,
          tax_type:             rec.tax_type as any,
          tax_rate:             Number(rec.tax_rate),
          discount_amount:      Number(rec.discount_amount),
          notes:                rec.notes ?? '',
          payment_instructions: rec.payment_instructions ?? '',
          items:                (rec.items as any[]) ?? [{ description: '', quantity: 1, unit_price: 0 }],
        }}
      />
    </div>
  )
}
