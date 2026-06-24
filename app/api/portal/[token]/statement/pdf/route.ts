import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPortalSession, SESSION_COOKIE } from '@/lib/portal-session'
import type { Client, Organization, Payment } from '@/types/database'
import type { StatementEntry } from '@/lib/pdf/statement-pdf'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const url       = new URL(req.url)
  const from      = url.searchParams.get('from') ?? ''
  const to        = url.searchParams.get('to')   ?? ''

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: clientRaw } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_token', token)
    .is('deleted_at', null)
    .single()

  if (!clientRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify portal session cookie matches this client
  const cookieStore     = await cookies()
  const sessionCookie   = cookieStore.get(SESSION_COOKIE)?.value
  const sessionClientId = sessionCookie ? verifyPortalSession(sessionCookie) : null

  if (sessionClientId !== clientRaw.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = clientRaw as Client
  const orgId  = client.organization_id

  const [{ data: orgRaw }, { data: invoicesRaw }, { data: paymentsRaw }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, total, currency, status')
      .eq('client_id', client.id)
      .eq('organization_id', orgId)
      .gte('issue_date', from)
      .lte('issue_date', to)
      .not('status', 'in', '("draft","void","cancelled")')
      .is('deleted_at', null)
      .order('issue_date'),
    supabase
      .from('payments')
      .select('id, invoice_id, amount, currency, payment_date, reference, payment_method')
      .eq('client_id', client.id)
      .eq('organization_id', orgId)
      .gte('payment_date', from)
      .lte('payment_date', to)
      .eq('status', 'completed')
      .order('payment_date'),
  ])

  if (!orgRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const org      = orgRaw as Organization
  const invoices = invoicesRaw ?? []
  const payments = (paymentsRaw ?? []) as Payment[]

  const currency    = client.preferred_currency ?? invoices[0]?.currency ?? 'USD'
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
