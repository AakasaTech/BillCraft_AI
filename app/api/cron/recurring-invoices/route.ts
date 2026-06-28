import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function addMonths(date: Date, n: number): Date {
  const d   = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + n)
  // Clamp if month overflowed (e.g. Jan 31 + 1 month → Feb 28)
  if (d.getDate() !== day) d.setDate(0)
  return d
}

function calcNextIssueDate(current: string, frequency: string): string {
  const d = new Date(current + 'T00:00:00Z')
  switch (frequency) {
    case 'weekly':    d.setUTCDate(d.getUTCDate() + 7);  break
    case 'biweekly':  d.setUTCDate(d.getUTCDate() + 14); break
    case 'monthly':   return addMonths(d, 1).toISOString().slice(0, 10)
    case 'quarterly': return addMonths(d, 3).toISOString().slice(0, 10)
    case 'yearly':    return addMonths(d, 12).toISOString().slice(0, 10)
  }
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  // Vercel sets Authorization: Bearer <CRON_SECRET> on cron calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today    = new Date().toISOString().slice(0, 10)

  const { data: due, error: fetchErr } = await supabase
    .from('recurring_invoices')
    .select('*')
    .lte('next_issue_date', today)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  let generated = 0
  const errors: string[] = []

  for (const rec of due ?? []) {
    try {
      // Atomically increment and get next invoice number
      const { data: invoiceNumber, error: numErr } = await supabase
        .rpc('next_invoice_number', { p_org_id: rec.organization_id })
      if (numErr) throw new Error(numErr.message)

      const issueDate = rec.next_issue_date
      const dueDateObj = new Date(issueDate + 'T00:00:00Z')
      dueDateObj.setUTCDate(dueDateObj.getUTCDate() + (rec.due_days ?? 30))
      const dueDate = dueDateObj.toISOString().slice(0, 10)

      // Compute totals from JSONB items
      const items    = Array.isArray(rec.items) ? rec.items : []
      const subtotal = items.reduce((s: number, i: any) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
      const discount = Math.min(Number(rec.discount_amount ?? 0), subtotal)
      const taxBase  = subtotal - discount
      const taxRate  = Number(rec.tax_rate ?? 0)
      const tax      = taxRate > 0 ? taxBase * (taxRate / 100) : 0
      const total    = taxBase + tax

      // Create invoice
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .insert({
          organization_id:      rec.organization_id,
          client_id:            rec.client_id,
          invoice_number:       invoiceNumber,
          status:               'draft',
          issue_date:           issueDate,
          due_date:             dueDate,
          currency:             rec.currency,
          exchange_rate:        1,
          tax_type:             rec.tax_type ?? 'none',
          tax_rate:             rec.tax_rate ?? 0,
          subtotal,
          discount_amount:      discount,
          tax_amount:           tax,
          total,
          amount_paid:          0,
          notes:                rec.notes ?? null,
          payment_instructions: rec.payment_instructions ?? null,
        })
        .select('id')
        .single()

      if (invErr) throw new Error(invErr.message)

      // Create invoice items
      if (items.length > 0) {
        const lineItems = items.map((item: any, idx: number) => {
          const lineTotal = Number(item.quantity) * Number(item.unit_price)
          return {
            invoice_id:      inv.id,
            organization_id: rec.organization_id,
            description:     item.description,
            quantity:        item.quantity,
            unit_price:      item.unit_price,
            tax_rate:        null,
            tax_amount:      0,
            discount_amount: 0,
            subtotal:        lineTotal,
            total:           lineTotal,
            sort_order:      idx,
          }
        })
        const { error: itemsErr } = await supabase.from('invoice_items').insert(lineItems)
        if (itemsErr) throw new Error(itemsErr.message)
      }

      // Advance the schedule
      const { error: updateErr } = await supabase
        .from('recurring_invoices')
        .update({
          next_issue_date: calcNextIssueDate(issueDate, rec.frequency),
          last_issued_at:  new Date().toISOString(),
          total_issued:    (rec.total_issued ?? 0) + 1,
        })
        .eq('id', rec.id)

      if (updateErr) throw new Error(updateErr.message)
      generated++
    } catch (err) {
      errors.push(`schedule ${rec.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    date: today,
    processed: due?.length ?? 0,
    generated,
    errors,
  })
}
