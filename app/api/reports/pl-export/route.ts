import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDateRange, toCsv } from '@/lib/reports'
import { EXPENSE_CATEGORY_LABEL } from '@/lib/expenses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return new NextResponse('Forbidden', { status: 403 })

  const orgId = userRecord.organization_id
  const sp    = req.nextUrl.searchParams

  const preset     = sp.get('preset') ?? 'this_year'
  const customFrom = sp.get('from')   ?? undefined
  const customTo   = sp.get('to')     ?? undefined
  const dateRange  = getDateRange(preset, customFrom, customTo)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('expenses')
    .select('date, category, description, vendor, amount, currency, notes')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (dateRange.from) q = q.gte('date', dateRange.from)
  if (dateRange.to)   q = q.lte('date', dateRange.to)

  const { data: rows, error } = await q
  if (error) return new NextResponse('Export failed', { status: 500 })

  const HEADER = ['Date', 'Category', 'Description', 'Vendor', 'Amount', 'Currency', 'Notes']

  const csvRows = ((rows ?? []) as Record<string, unknown>[]).map(row => [
    row.date,
    EXPENSE_CATEGORY_LABEL[row.category as string] ?? row.category,
    row.description,
    row.vendor ?? '',
    Number(row.amount).toFixed(2),
    row.currency,
    row.notes ?? '',
  ])

  const date = new Date().toISOString().slice(0, 10)
  const csv  = toCsv([HEADER, ...csvRows] as (string | number | null | undefined)[][])

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="expenses-${date}.csv"`,
      'Cache-Control':       'no-store',
    },
  })
}
