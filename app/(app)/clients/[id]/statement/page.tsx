import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatementView } from '@/components/clients/statement-view'
import type { Client, Payment } from '@/types/database'
import type { StatementEntry } from '@/lib/pdf/statement-pdf'

export const metadata = { title: 'Client Statement — BillCraft AI' }

function defaultDateRange() {
  const now   = new Date()
  const year  = now.getFullYear()
  const today = now.toISOString().slice(0, 10)
  return { from: `${year}-01-01`, to: today }
}

export default async function ClientStatementPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { id }   = await params
  const sp       = await searchParams
  const defaults = defaultDateRange()
  const from     = sp.from ?? defaults.from
  const to       = sp.to   ?? defaults.to

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: clientRaw }, { data: invoicesRaw }, { data: paymentsRaw }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', id).eq('organization_id', orgId).is('deleted_at', null).single(),
      supabase
        .from('invoices')
        .select('*')
        .eq('client_id', id).eq('organization_id', orgId)
        .gte('issue_date', from).lte('issue_date', to)
        .not('status', 'in', '("draft","void","cancelled")')
        .is('deleted_at', null)
        .order('issue_date'),
      supabase
        .from('payments')
        .select('*')
        .eq('client_id', id).eq('organization_id', orgId)
        .gte('payment_date', from).lte('payment_date', to)
        .eq('status', 'completed')
        .order('payment_date'),
    ])

  if (!clientRaw) notFound()

  const client   = clientRaw as Client
  const invoices = invoicesRaw ?? []
  const payments = (paymentsRaw ?? []) as Payment[]

  const currency    = client.preferred_currency ?? invoices[0]?.currency ?? 'USD'
  const invoiceNums = Object.fromEntries(invoices.map(i => [i.id, i.invoice_number]))

  const raw: StatementEntry[] = [
    ...invoices.map(inv => ({
      date: inv.issue_date, type: 'invoice' as const,
      reference: inv.invoice_number, description: 'Invoice issued',
      charged: inv.total, paid: 0, balance: 0,
    })),
    ...payments.map(p => ({
      date: p.payment_date, type: 'payment' as const,
      reference: p.reference ?? invoiceNums[p.invoice_id] ?? '—',
      description: `Payment received (${p.payment_method.replace(/_/g, ' ')})`,
      charged: 0, paid: p.amount, balance: 0,
    })),
  ]

  raw.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'invoice' ? -1 : 1))

  let running = 0
  const entries: StatementEntry[] = raw.map(e => {
    running += e.charged - e.paid
    return { ...e, balance: running }
  })

  const totalCharged = entries.reduce((s, e) => s + e.charged, 0)
  const totalPaid    = entries.reduce((s, e) => s + e.paid,    0)
  const outstanding  = totalCharged - totalPaid

  return (
    <StatementView
      clientId={id}
      clientName={client.name}
      clientEmail={client.email}
      from={from}
      to={to}
      currency={currency}
      entries={entries}
      totalCharged={totalCharged}
      totalPaid={totalPaid}
      outstanding={outstanding}
    />
  )
}
