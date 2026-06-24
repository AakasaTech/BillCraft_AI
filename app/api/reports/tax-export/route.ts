import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDateRange, toCsv } from '@/lib/reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TAX_TYPE_LABEL: Record<string, string> = {
  vat:       'VAT',
  gst:       'GST',
  sales_tax: 'Sales Tax',
  none:      'No Tax',
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return new NextResponse('Forbidden', { status: 403 })

  const orgId = userRecord.organization_id
  const sp    = req.nextUrl.searchParams

  const preset    = sp.get('preset') ?? 'this_year'
  const customFrom = sp.get('from')  ?? undefined
  const customTo   = sp.get('to')    ?? undefined
  const basis      = sp.get('basis') ?? 'accrual'
  const dateRange  = getDateRange(preset, customFrom, customTo)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('invoices')
    .select('invoice_number, issue_date, paid_at, tax_type, tax_rate, currency, subtotal, discount_amount, tax_amount, total, clients(name)')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })

  if (basis === 'cash') {
    q = q.eq('status', 'paid')
    if (dateRange.from) q = q.gte('paid_at', dateRange.from)
    if (dateRange.to)   q = q.lte('paid_at', dateRange.to + 'T23:59:59.999Z')
  } else {
    q = q.not('status', 'in', '("draft","cancelled","void")')
    if (dateRange.from) q = q.gte('issue_date', dateRange.from)
    if (dateRange.to)   q = q.lte('issue_date', dateRange.to)
  }

  const { data: rows, error } = await q
  if (error) return new NextResponse('Export failed', { status: 500 })

  const HEADER = [
    'Invoice Number', 'Client', 'Issue Date', 'Paid Date',
    'Tax Type', 'Tax Rate (%)', 'Currency',
    'Net Amount', 'Tax Amount', 'Gross Amount',
  ]

  const csvRows = ((rows ?? []) as Record<string, unknown>[]).map((row) => {
    const client = row.clients as { name?: string } | null
    const net    = Number(row.subtotal) - Number(row.discount_amount)
    return [
      row.invoice_number,
      client?.name ?? '',
      row.issue_date,
      row.paid_at ?? '',
      TAX_TYPE_LABEL[row.tax_type as string] ?? row.tax_type,
      Number(row.tax_rate).toFixed(2),
      row.currency,
      net.toFixed(2),
      Number(row.tax_amount).toFixed(2),
      Number(row.total).toFixed(2),
    ]
  })

  const date = new Date().toISOString().split('T')[0]
  const csv  = toCsv([HEADER, ...csvRows])

  return new NextResponse(csv, {
    status:  200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tax-summary-${date}.csv"`,
      'Cache-Control':       'no-store',
    },
  })
}
