import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toCsv } from '@/lib/reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function classifyBucket(dueDate: string | null, todayMs: number): { label: string; daysOverdue: number } {
  if (!dueDate) return { label: 'Current', daysOverdue: 0 }
  const dueMs       = new Date(dueDate + 'T00:00:00Z').getTime()
  const daysOverdue = Math.floor((todayMs - dueMs) / 86_400_000)
  if (daysOverdue <= 0)  return { label: 'Current',    daysOverdue: 0 }
  if (daysOverdue <= 30) return { label: '1-30 days',  daysOverdue }
  if (daysOverdue <= 60) return { label: '31-60 days', daysOverdue }
  if (daysOverdue <= 90) return { label: '61-90 days', daysOverdue }
  return { label: '90+ days', daysOverdue }
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return new NextResponse('Forbidden', { status: 403 })

  const orgId = userRecord.organization_id

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, issue_date, due_date, currency, amount_due, clients(name)')
    .eq('organization_id', orgId)
    .in('status', ['sent', 'viewed', 'partial', 'overdue'])
    .is('deleted_at', null)
    .gt('amount_due', 0)
    .order('due_date', { ascending: true })

  if (error) return new NextResponse('Export failed', { status: 500 })

  const today   = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  const HEADER = ['Client', 'Invoice Number', 'Issue Date', 'Due Date', 'Days Overdue', 'Bucket', 'Currency', 'Amount Due']
  const rows   = (invoices ?? []).map((inv) => {
    const client = (inv as any).clients as { name?: string } | null
    const { label, daysOverdue } = classifyBucket(inv.due_date, todayMs)
    return [
      client?.name ?? '',
      inv.invoice_number,
      inv.issue_date,
      inv.due_date ?? '',
      daysOverdue,
      label,
      inv.currency,
      Number(inv.amount_due).toFixed(2),
    ]
  })

  const date = today.toISOString().split('T')[0]
  const csv  = toCsv([HEADER, ...rows])

  return new NextResponse(csv, {
    status:  200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ar-aging-${date}.csv"`,
      'Cache-Control':       'no-store',
    },
  })
}
