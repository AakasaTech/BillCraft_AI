import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'

interface LineItem {
  description: string;
  quantity:    number;
  rate:        number;
  amount:      number;
}

interface TaskCraftMetadata {
  source:       'taskcraft';
  workspace_id: string;
  project_id?:  string | null;
  date_from:    string;
  date_to:      string;
  entry_ids:    string[];
}

interface CreateInvoiceBody {
  billcraft_client_id: string;
  title:               string;
  due_date?:           string | null;
  currency?:           string;
  notes?:              string | null;
  line_items:          LineItem[];
  metadata?:           TaskCraftMetadata;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildNotes({
  title,
  notes,
  metadata,
}: {
  title?:    string | null
  notes?:    string | null
  metadata?: TaskCraftMetadata
}): string {
  const parts: string[] = []

  if (title) parts.push(title)

  if (metadata?.source === 'taskcraft') {
    const lines = ['--- TaskCraft ---']
    if (metadata.date_from && metadata.date_to)
      lines.push(`Period: ${metadata.date_from} → ${metadata.date_to}`)
    if (metadata.entry_ids?.length)
      lines.push(`Time entries: ${metadata.entry_ids.length}`)
    parts.push(lines.join('\n'))
  }

  if (notes) parts.push(notes)

  return parts.join('\n\n') || 'Created via TaskCraft AI'
}

// ── GET /api/v1/invoices ──────────────────────────────────────────────────────
// Query params: client_id, status, from (YYYY-MM-DD), to (YYYY-MM-DD),
//               limit (default 50, max 200), offset (default 0)
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  const status   = searchParams.get('status')
  const from     = searchParams.get('from')
  const to       = searchParams.get('to')
  const limit    = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const offset   = Number(searchParams.get('offset') ?? 0)

  const db = createServiceClient()

  let query = db
    .from('invoices')
    .select('id, invoice_number, client_id, status, subtotal, tax_amount, total, currency, issue_date, due_date, amount_paid, amount_due, created_at', { count: 'exact' })
    .eq('organization_id', auth.orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (clientId) query = query.eq('client_id', clientId)
  if (status)   query = query.eq('status', status)
  if (from)     query = query.gte('issue_date', from)
  if (to)       query = query.lte('issue_date', to)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return NextResponse.json({
    data: (data ?? []).map((inv) => ({
      id:          inv.id,
      number:      inv.invoice_number,
      client_id:   inv.client_id,
      status:      inv.status,
      subtotal:    Number(inv.subtotal),
      tax_amount:  Number(inv.tax_amount),
      total:       Number(inv.total),
      currency:    inv.currency,
      issue_date:  inv.issue_date,
      due_date:    inv.due_date ?? null,
      amount_paid: Number(inv.amount_paid),
      amount_due:  Number(inv.amount_due),
      created_at:  inv.created_at,
      url:         `${baseUrl}/invoices/${inv.id}`,
    })),
    total:  count ?? 0,
    limit,
    offset,
  })
}

// ── POST /api/v1/invoices ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: CreateInvoiceBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { billcraft_client_id, title, due_date, currency = 'USD', notes, line_items, metadata } = body

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
      notes:           buildNotes({ title, notes, metadata }),
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
