import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientDetailView } from '@/components/clients/client-detail-view'
import type { Client, ClientSubunit } from '@/types/database'

export const metadata = { title: 'Client — BillCraft AI' }

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: client }, { data: invoicesRaw }, { data: org }, { data: subunitsRaw }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('invoices')
      .select('*')
      .eq('client_id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('organizations')
      .select('category')
      .eq('id', orgId)
      .single(),
    supabase
      .from('client_subunits')
      .select('*')
      .eq('client_id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('name'),
  ])

  if (!client) notFound()

  const isTrading = org?.category === 'trading'
  const subunits  = (subunitsRaw ?? []) as ClientSubunit[]

  const invoices = invoicesRaw ?? []

  // Determine the display currency (prefer client setting, fall back to most common in invoices)
  const currency =
    client.preferred_currency ??
    (invoices[0]?.currency ?? 'USD')

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const totalPaid     = invoices.reduce((s, i) => s + (i.amount_paid ?? 0), 0)
  const outstanding   = invoices.reduce((s, i) => s + (i.amount_due ?? 0), 0)

  return (
    <ClientDetailView
      client={client as Client}
      invoices={invoices}
      stats={{ totalInvoiced, totalPaid, outstanding, currency }}
      isTrading={isTrading}
      subunits={subunits}
    />
  )
}
