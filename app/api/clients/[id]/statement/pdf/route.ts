import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Client, Organization, Payment } from '@/types/database'
import type { StatementEntry } from '@/lib/pdf/statement-pdf'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id }  = await params
  const url     = new URL(req.url)
  const from    = url.searchParams.get('from') ?? ''
  const to      = url.searchParams.get('to')   ?? ''

  if (!from || !to) return NextResponse.json({ error: 'from and to are required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const orgId = userRecord.organization_id

  const [{ data: clientRaw }, { data: orgRaw }, { data: invoicesRaw }, { data: paymentsRaw }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', id).eq('organization_id', orgId).is('deleted_at', null).single(),
      supabase.from('organizations').select('*').eq('id', orgId).single(),
      supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, total, currency, status')
        .eq('client_id', id).eq('organization_id', orgId)
        .gte('issue_date', from).lte('issue_date', to)
        .not('status', 'in', '("draft","void","cancelled")')
        .is('deleted_at', null)
        .order('issue_date'),
      supabase
        .from('payments')
        .select('id, invoice_id, amount, currency, payment_date, reference, payment_method')
        .eq('client_id', id).eq('organization_id', orgId)
        .gte('payment_date', from).lte('payment_date', to)
        .eq('status', 'completed')
        .order('payment_date'),
    ])

  if (!clientRaw || !orgRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const client   = clientRaw as Client
  const org      = orgRaw as Organization
  const invoices = invoicesRaw ?? []
  const payments = (paymentsRaw ?? []) as Payment[]

  const currency = client.preferred_currency ?? invoices[0]?.currency ?? 'USD'

  const invoiceNums = Object.fromEntries(invoices.map(i => [i.id, i.invoice_number]))

  const raw: StatementEntry[] = [
    ...invoices.map(inv => ({
      date:        inv.issue_date,
      type:        'invoice' as const,
      reference:   inv.invoice_number,
      description: 'Invoice issued',
      charged:     inv.total,
      paid:        0,
      balance:     0,
    })),
    ...payments.map(p => ({
      date:        p.payment_date,
      type:        'payment' as const,
      reference:   p.reference ?? invoiceNums[p.invoice_id] ?? '—',
      description: `Payment received (${p.payment_method.replace(/_/g, ' ')})`,
      charged:     0,
      paid:        p.amount,
      balance:     0,
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

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { StatementPDF }   = await import('@/lib/pdf/statement-pdf')

  const buffer = await renderToBuffer(
    createElement(StatementPDF, {
      org, client, from_date: from, to_date: to, currency,
      entries, totalCharged, totalPaid, outstanding,
    }),
  )

  const filename = `statement-${client.name.replace(/\s+/g, '-')}-${from}-${to}.pdf`

  return new Response(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
