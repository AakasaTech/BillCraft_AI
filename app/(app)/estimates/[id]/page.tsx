import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { approvalGateActive, isSoleApprover } from '@/lib/invoice-approval'
import { EstimateDetailView } from '@/components/estimates/estimate-detail-view'
import type { Estimate, EstimateItem, Client, ClientSubunit, Organization } from '@/types/database'

export const metadata = { title: 'Estimate — BillCraft AI' }

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [approvalRequired, soleApprover, [{ data: estimateRaw }, { data: itemsRaw }, { data: org }]] = await Promise.all([
    approvalGateActive(orgId, supabase),
    isSoleApprover(orgId, user.id, supabase),
    Promise.all([
      supabase
        .from('estimates')
        .select('*, clients(*)')
        .eq('id', id)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .single(),
      supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', id)
        .order('sort_order'),
      supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single(),
    ]),
  ])

  if (!estimateRaw || !org) notFound()

  const estimate = estimateRaw as Estimate & { clients: Client | null }
  const client   = estimate.clients
  if (!client) notFound()

  let clientSubunit: ClientSubunit | null = null
  if (estimate.client_subunit_id) {
    const { data } = await supabase
      .from('client_subunits')
      .select('*')
      .eq('id', estimate.client_subunit_id)
      .single()
    clientSubunit = (data as ClientSubunit | null) ?? null
  }

  return (
    <EstimateDetailView
      estimate={estimate}
      items={(itemsRaw ?? []) as EstimateItem[]}
      client={client}
      clientSubunit={clientSubunit}
      org={org as Organization}
      approvalRequired={approvalRequired}
      canApprove={userRecord.is_invoice_approver === true}
      isCreator={estimate.created_by === user.id}
      isSoleApprover={approvalRequired && soleApprover}
      isApproved={!!estimate.approved_at}
    />
  )
}
