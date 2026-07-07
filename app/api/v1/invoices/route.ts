import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'

interface LineItem {
  description: string;
  quantity:    number;
  rate:        number;
  amount:      number;
}

interface CreateInvoiceBody {
  billcraft_client_id: string;
  title:               string;
  due_date?:           string | null;
  currency?:           string;
  notes?:              string | null;
  line_items:          LineItem[];
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: CreateInvoiceBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { billcraft_client_id, title, due_date, currency = 'USD', notes, line_items } = body

  if (!billcraft_client_id || !Array.isArray(line_items) || line_items.length === 0) {
    return NextResponse.json({ error: 'billcraft_client_id and line_items are required' }, { status: 400 })
  }

  const db = createServiceClient()

  // Verify client belongs to this org
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('id, name')
    .eq('id', billcraft_client_id)
    .eq('organization_id', auth.orgId)
    .is('deleted_at', null)
    .single()

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Get next invoice number via RPC (same function used by the app itself)
  const { data: invoiceNumber, error: numErr } = await db.rpc('next_invoice_number', {
    p_org_id: auth.orgId,
  })
  if (numErr) return NextResponse.json({ error: numErr.message }, { status: 500 })

  // Compute totals (no discount/tax for API-created invoices)
  const subtotal = line_items.reduce((s, li) => s + (Number(li.amount) || 0), 0)

  // Create invoice
  const { data: inv, error: invErr } = await db
    .from('invoices')
    .insert({
      organization_id: auth.orgId,
      client_id:       billcraft_client_id,
      invoice_number:  invoiceNumber as string,
      status:          'draft',
      issue_date:      new Date().toISOString().slice(0, 10),
      due_date:        due_date || null,
      currency,
      exchange_rate:   1,
      tax_type:        'none',
      tax_rate:        0,
      subtotal,
      discount_amount: 0,
      tax_amount:      0,
      total:           subtotal,
      amount_paid:     0,
      notes:           notes || (title ? `${title}\n\nCreated via TaskCraft AI` : 'Created via TaskCraft AI'),
    })
    .select('id, invoice_number, status, total, currency, created_at')
    .single()

  if (invErr || !inv) {
    return NextResponse.json({ error: invErr?.message ?? 'Failed to create invoice' }, { status: 500 })
  }

  // Insert line items
  const items = line_items.map((li, i) => ({
    invoice_id:      inv.id,
    organization_id: auth.orgId,
    description:     li.description,
    quantity:        Number(li.quantity) || 1,
    unit_price:      Number(li.rate) || 0,
    tax_rate:        null,
    tax_amount:      0,
    discount_amount: 0,
    subtotal:        Number(li.amount) || 0,
    total:           Number(li.amount) || 0,
    sort_order:      i,
  }))

  const { error: itemsErr } = await db.from('invoice_items').insert(items)
  if (itemsErr) {
    // Roll back invoice on item insert failure
    await db.from('invoices').delete().eq('id', inv.id)
    return NextResponse.json({ error: itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      id:         inv.id,
      number:     inv.invoice_number,
      client_id:  billcraft_client_id,
      title:      title ?? inv.invoice_number,
      status:     inv.status,
      total:      inv.total,
      currency:   inv.currency,
      created_at: inv.created_at,
      url:        `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invoices/${inv.id}`,
    },
  }, { status: 201 })
}
