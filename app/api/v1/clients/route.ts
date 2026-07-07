import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: clients, error } = await db
    .from('clients')
    .select('id, name, email')
    .eq('organization_id', auth.orgId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: (clients ?? []).map((c) => ({
      id:      c.id,
      name:    c.name,
      email:   c.email ?? null,
      company: c.name,  // BillCraft uses "name" for the client/company name
    })),
  })
}
