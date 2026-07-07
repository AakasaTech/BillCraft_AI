import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'

// ── GET /api/v1/clients ───────────────────────────────────────────────────────
// Query params: q (name search), limit (default 200), offset (default 0)
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q      = searchParams.get('q')?.trim()
  const limit  = Math.min(Number(searchParams.get('limit') ?? 200), 500)
  const offset = Number(searchParams.get('offset') ?? 0)

  const db = createServiceClient()

  let query = db
    .from('clients')
    .select('id, name, email, phone', { count: 'exact' })
    .eq('organization_id', auth.orgId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')
    .range(offset, offset + limit - 1)

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: clients, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: (clients ?? []).map((c) => ({
      id:      c.id,
      name:    c.name,
      email:   c.email   ?? null,
      phone:   c.phone   ?? null,
      // BillCraft uses "name" as the company/client name — map for compatibility
      company: c.name,
    })),
    total:  count ?? 0,
    limit,
    offset,
  })
}

// ── POST /api/v1/clients ──────────────────────────────────────────────────────
// Body: { name, email?, phone?, company?, currency? }
// "company" is accepted for API compatibility but ignored — name is used instead.
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    name:      string
    email?:    string | null
    phone?:    string | null
    company?:  string | null
    currency?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = (body.name ?? body.company ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const db = createServiceClient()

  const { data: client, error } = await db
    .from('clients')
    .insert({
      organization_id:   auth.orgId,
      name,
      email:             body.email  || null,
      phone:             body.phone  || null,
      preferred_currency: body.currency || null,
      is_active:         true,
    })
    .select('id, name, email, phone, preferred_currency, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: {
      id:         client.id,
      name:       client.name,
      email:      client.email     ?? null,
      phone:      client.phone     ?? null,
      company:    client.name,
      currency:   client.preferred_currency ?? null,
      created_at: client.created_at,
    },
  }, { status: 201 })
}
