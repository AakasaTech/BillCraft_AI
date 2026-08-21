import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { approvalGateActive, isSoleApprover } from '@/lib/invoice-approval'
import { ProformasTable } from '@/components/proformas/proformas-table'
import { Button } from '@/components/ui/button'
import type { ProformaStatus } from '@/types/database'

export const metadata = { title: 'Proformas — BillCraft AI' }

export default async function ProformasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const { data: org } = await supabase
    .from('organizations').select('category').eq('id', orgId).single()
  if (org?.category !== 'trading') redirect('/dashboard')

  const [approvalRequired, soleApprover] = await Promise.all([
    approvalGateActive(orgId, supabase),
    isSoleApprover(orgId, user.id, supabase),
  ])

  const { data: proformasRawResult } = await supabase
    .from('proformas')
    .select('id, proforma_number, status, total, currency, issue_date, expiry_date, share_token, approved_at, clients(name)')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  type ProformaWithClient = { id: string; proforma_number: string; status: string; total: number; currency: string; issue_date: string; expiry_date: string | null; share_token: string | null; approved_at: string | null; clients: { name: string } | null }
  const proformasRaw = proformasRawResult as ProformaWithClient[] | null

  const proformas = (proformasRaw ?? []).map(p => ({
    id:              p.id,
    proforma_number: p.proforma_number,
    status:          p.status as ProformaStatus,
    total:           p.total,
    currency:        p.currency,
    issue_date:      p.issue_date,
    expiry_date:     p.expiry_date,
    share_token:     p.share_token,
    approved_at:     p.approved_at,
    client_name:     p.clients?.name ?? '—',
  }))

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proformas</h1>
          <p className="text-sm text-muted-foreground">
            {proformas.length} proforma{proformas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/proformas/new">
            <PlusIcon className="mr-2 h-4 w-4" /> New proforma
          </Link>
        </Button>
      </div>

      <ProformasTable proformas={proformas} approvalRequired={approvalRequired} soleApprover={approvalRequired && soleApprover} />
    </div>
  )
}
