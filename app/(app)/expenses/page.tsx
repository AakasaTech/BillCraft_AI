import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExpensesClient } from '@/components/expenses/expenses-client'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'
import { getPlanStatus } from '@/lib/subscription'
import type { Expense } from '@/types/database'

export const metadata: Metadata = { title: 'Expenses — BillCraft AI' }

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const plan = await getPlanStatus(orgId, supabase)
  if (!plan.canUseExpenses) {
    return (
      <div className="p-6">
        <UpgradePrompt
          feature="Expense Tracking"
          description="Log business expenses, categorise spending, and generate P&L reports. Available on Pro and Agency plans."
        />
      </div>
    )
  }

  const [{ data: orgData }, { data: expenses }] = await Promise.all([
    supabase.from('organizations').select('default_currency').eq('id', orgId).single(),
    supabase.from('expenses')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('date',       { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-6">
      <ExpensesClient
        expenses={(expenses as Expense[]) ?? []}
        defaultCurrency={orgData?.default_currency ?? 'USD'}
      />
    </div>
  )
}
