import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientDetailView } from '@/components/clients/client-detail-view'
import type { Client } from '@/types/database'

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
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: client }, { data: invoicesRaw }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, issue_date, due_date, currency, total, amount_paid, amount_due')
      .eq('client_id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

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
    />
  )
}
