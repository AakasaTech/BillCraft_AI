import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'

// ── GET /api/v1/invoices/:id ──────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createServiceClient()

  const [invRes, itemsRes] = await Promise.all([
    db
      .from('invoices')
      .select('id, invoice_number, client_id, status, subtotal, discount_amount, tax_amount, total, currency, issue_date, due_date, amount_paid, amount_due, notes, terms, created_at')
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .is('deleted_at', null)
      .single(),
    db
      .from('invoice_items')
      .select('id, description, quantity, unit_price, subtotal, total, sort_order')
      .eq('invoice_id', id)
      .order('sort_order'),
  ])

  if (invRes.error || !invRes.data) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const inv   = invRes.data
  const items = itemsRes.data ?? []
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return NextResponse.json({
    data: {
      id:              inv.id,
      number:          inv.invoice_number,
      client_id:       inv.client_id,
      status:          inv.status,
      subtotal:        Number(inv.subtotal),
      discount_amount: Number(inv.discount_amount),
      tax_amount:      Number(inv.tax_amount),
      total:           Number(inv.total),
      currency:        inv.currency,
      issue_date:      inv.issue_date,
      due_date:        inv.due_date ?? null,
      amount_paid:     Number(inv.amount_paid),
      amount_due:      Number(inv.amount_due),
      notes:           inv.notes ?? null,
      terms:           inv.terms ?? null,
      created_at:      inv.created_at,
      url:             `${baseUrl}/invoices/${inv.id}`,
      line_items: items.map((li) => ({
        id:          li.id,
        description: li.description,
        quantity:    Number(li.quantity),
        unit_price:  Number(li.unit_price),
        subtotal:    Number(li.subtotal),
        total:       Number(li.total),
      })),
    },
  })
}
