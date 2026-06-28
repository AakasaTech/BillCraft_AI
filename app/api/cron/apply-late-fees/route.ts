import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function addDays(base: Date, n: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const todayDate = new Date()
  todayDate.setUTCHours(0, 0, 0, 0)
  const todayStr = todayDate.toISOString().slice(0, 10)

  // 1 — Orgs with late fees enabled
  const { data: orgs, error: orgsErr } = await supabase
    .from('organizations')
    .select('id, late_fee_percentage, late_fee_after_days')
    .eq('late_fee_enabled', true)

  if (orgsErr) return NextResponse.json({ error: orgsErr.message }, { status: 500 })
  if (!orgs?.length) return NextResponse.json({ date: todayStr, applied: 0 })

  let applied = 0
  const errors: string[] = []

  for (const org of orgs) {
    try {
      const pct       = Number(org.late_fee_percentage)
      const afterDays = Number(org.late_fee_after_days)

      // Cutoff: due_date <= today - afterDays means the invoice has been
      // overdue for at least afterDays days (0 = apply the day it becomes overdue)
      const cutoff = addDays(todayDate, -afterDays)

      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select('id, invoice_number, currency, subtotal, total, amount_due, amount_paid')
        .eq('organization_id', org.id)
        .in('status', ['sent', 'viewed', 'partial', 'overdue'])
        .is('deleted_at', null)
        .is('late_fee_applied_at', null)
        .not('due_date', 'is', null)
        .lte('due_date', cutoff)
        .gt('amount_due', 0)

      if (invErr) throw new Error(invErr.message)
      if (!invoices?.length) continue

      for (const inv of invoices) {
        try {
          const fee = Math.round(Number(inv.amount_due) * (pct / 100) * 100) / 100
          if (fee < 0.01) continue

          // Get the next sort_order for this invoice's items
          const { count: itemCount } = await supabase
            .from('invoice_items')
            .select('id', { count: 'exact', head: true })
            .eq('invoice_id', inv.id)

          const sortOrder = itemCount ?? 0

          // Insert late fee line item
          const { error: itemErr } = await supabase
            .from('invoice_items')
            .insert({
              invoice_id:      inv.id,
              organization_id: org.id,
              description:     `Late payment fee (${pct}%)`,
              quantity:        1,
              unit_price:      fee,
              tax_rate:        null,
              tax_amount:      0,
              discount_amount: 0,
              subtotal:        fee,
              total:           fee,
              sort_order:      sortOrder,
            })

          if (itemErr) throw new Error(itemErr.message)

          // Update invoice totals + stamp late_fee_applied_at
          const { error: updErr } = await supabase
            .from('invoices')
            .update({
              subtotal:            Number(inv.subtotal) + fee,
              total:               Number(inv.total) + fee,
              late_fee_applied_at: new Date().toISOString(),
            })
            .eq('id', inv.id)

          if (updErr) throw new Error(updErr.message)

          // Audit log (fire-and-forget)
          void supabase.from('audit_logs').insert({
            organization_id: org.id,
            user_id:         null,
            entity_type:     'invoice',
            entity_id:       inv.id,
            action:          'update',
            old_values:      { total: inv.total, amount_due: inv.amount_due },
            new_values:      { late_fee: fee, total: Number(inv.total) + fee },
            ip_address:      null,
            user_agent:      null,
          })

          applied++
        } catch (err) {
          errors.push(`invoice ${inv.id}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    } catch (err) {
      errors.push(`org ${org.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ date: todayStr, applied, errors })
}
