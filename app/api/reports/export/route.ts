import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDateRange } from '@/lib/reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ROWS = 5_000

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return new NextResponse('Forbidden', { status: 403 })

  const orgId    = userRecord.organization_id
  const sp       = req.nextUrl.searchParams
  const preset   = sp.get('preset')  ?? 'this_month'
  const clientId = sp.get('client')  ?? undefined
  const status   = sp.get('status')  ?? undefined
  const range    = getDateRange(preset, sp.get('from') ?? undefined, sp.get('to') ?? undefined)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('invoices')
    .select('invoice_number, issue_date, due_date, status, currency, subtotal, discount_amount, tax_amount, total, amount_paid, amount_due, clients(name)')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .limit(MAX_ROWS)

  if (range.from) q = q.gte('issue_date', range.from)
  if (range.to)   q = q.lte('issue_date', range.to)
  if (clientId)   q = q.eq('client_id', clientId)
  if (status)     q = q.eq('status', status)

  const { data: rows, error } = await q

  if (error) return new NextResponse('Export failed', { status: 500 })

  const HEADER = [
    'Invoice Number', 'Client', 'Issue Date', 'Due Date', 'Status',
    'Currency', 'Subtotal', 'Discount', 'Tax', 'Total', 'Amount Paid', 'Amount Due',
  ]

  const lines: string[] = [HEADER.map(csvCell).join(',')]

  for (const row of (rows ?? []) as Record<string, unknown>[]) {
    const client = row.clients as unknown as { name?: string } | null
    lines.push([
      csvCell(row.invoice_number as string),
      csvCell(client?.name ?? ''),
      csvCell(row.issue_date as string),
      csvCell(row.due_date   as string),
      csvCell(row.status     as string),
      csvCell(row.currency   as string),
      csvCell((row.subtotal        as number)?.toFixed(2)),
      csvCell((row.discount_amount as number)?.toFixed(2)),
      csvCell((row.tax_amount      as number)?.toFixed(2)),
      csvCell((row.total           as number)?.toFixed(2)),
      csvCell((row.amount_paid     as number)?.toFixed(2)),
      csvCell((row.amount_due      as number)?.toFixed(2)),
    ].join(','))
  }

  const filename = `billcraft-invoices-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(lines.join('\r\n'), {
    status:  200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
