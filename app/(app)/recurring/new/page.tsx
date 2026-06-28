import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecurringForm } from '@/components/recurring/recurring-form'

export const metadata: Metadata = { title: 'New Recurring Schedule — BillCraft AI' }

export default async function NewRecurringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const [{ data: clients }, { data: org }] = await Promise.all([
    supabase
      .from('clients').select('*')
      .eq('organization_id', userRecord.organization_id)
      .is('deleted_at', null).eq('is_active', true)
      .order('name'),
    supabase
      .from('organizations').select('*')
      .eq('id', userRecord.organization_id).single(),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">New Recurring Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Configure an invoice that auto-generates as a draft on a set schedule.
        </p>
      </div>
      <RecurringForm
        clients={clients ?? []}
        defaultCurrency={org?.default_currency ?? 'USD'}
      />
    </div>
  )
}
