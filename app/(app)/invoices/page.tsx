import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoicesTable, type InvoiceRow } from '@/components/invoices/invoices-table'

export const metadata = { title: 'Invoices — BillCraft AI' }

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const { data: rawResult } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, total, currency, issue_date, due_date,
      clients ( name )
    `)
    .eq('organization_id', userRecord.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  type InvoiceWithClient = { id: string; invoice_number: string; status: string; total: number; currency: string; issue_date: string; due_date: string | null; clients: { name: string } | null }
  const raw = rawResult as InvoiceWithClient[] | null

  const invoices: InvoiceRow[] = (raw ?? []).map((inv) => ({
    id:             inv.id,
    invoice_number: inv.invoice_number,
    status:         inv.status,
    total:          inv.total,
    currency:       inv.currency,
    issue_date:     inv.issue_date,
    due_date:       inv.due_date,
    client_name:    inv.clients?.name ?? 'Unknown client',
  }))

  const { q } = await searchParams

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-muted-foreground">Create, manage, and track all your invoices.</p>
      </div>
      <InvoicesTable invoices={invoices} defaultSearch={q ?? ''} />
    </div>
  )
}
