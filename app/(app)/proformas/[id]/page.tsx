import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProformaDetailView } from '@/components/proformas/proforma-detail-view'
import type { Proforma, ProformaItem, Client, ClientSubunit, Organization } from '@/types/database'

export const metadata = { title: 'Proforma — BillCraft AI' }

export default async function ProformaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: proformaRaw }, { data: itemsRaw }, { data: org }] = await Promise.all([
    supabase
      .from('proformas')
      .select('*, clients(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('proforma_items')
      .select('*')
      .eq('proforma_id', id)
      .order('sort_order'),
    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single(),
  ])

  if (!proformaRaw || !org) notFound()

  const proforma = proformaRaw as Proforma & { clients: Client | null }
  const client   = proforma.clients
  if (!client) notFound()

  let clientSubunit: ClientSubunit | null = null
  if (proforma.client_subunit_id) {
    const { data } = await supabase
      .from('client_subunits')
      .select('*')
      .eq('id', proforma.client_subunit_id)
      .single()
    clientSubunit = (data as ClientSubunit | null) ?? null
  }

  return (
    <ProformaDetailView
      proforma={proforma}
      items={(itemsRaw ?? []) as ProformaItem[]}
      client={client}
      clientSubunit={clientSubunit}
      org={org as Organization}
    />
  )
}
