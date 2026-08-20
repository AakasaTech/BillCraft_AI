import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { approvalGateActive, getApproverCount } from '@/lib/invoice-approval'
import { EstimatesTable } from '@/components/estimates/estimates-table'
import { Button } from '@/components/ui/button'
import type { Estimate, EstimateStatus } from '@/types/database'

export const metadata = { title: 'Estimates — BillCraft AI' }

export default async function EstimatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const [approvalRequired, approverCount] = await Promise.all([
    approvalGateActive(userRecord.organization_id, supabase),
    getApproverCount(userRecord.organization_id, supabase),
  ])

  const { data: estimatesRawResult } = await supabase
    .from('estimates')
    .select('id, estimate_number, status, total, currency, issue_date, expiry_date, share_token, clients(name)')
    .eq('organization_id', userRecord.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  type EstimateWithClient = { id: string; estimate_number: string; status: string; total: number; currency: string; issue_date: string; expiry_date: string | null; share_token: string | null; clients: { name: string } | null }
  const estimatesRaw = estimatesRawResult as EstimateWithClient[] | null

  const estimates = (estimatesRaw ?? []).map(e => ({
    id:              e.id,
    estimate_number: e.estimate_number,
    status:          e.status as EstimateStatus,
    total:           e.total,
    currency:        e.currency,
    issue_date:      e.issue_date,
    expiry_date:     e.expiry_date,
    share_token:     e.share_token,
    client_name:     e.clients?.name ?? '—',
  }))

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Estimates</h1>
          <p className="text-sm text-muted-foreground">
            {estimates.length} estimate{estimates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/estimates/new">
            <PlusIcon className="mr-2 h-4 w-4" /> New estimate
          </Link>
        </Button>
      </div>

      <EstimatesTable estimates={estimates} approvalRequired={approvalRequired} soleApprover={approvalRequired && approverCount === 1} />
    </div>
  )
}
