import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: org, error } = await db
    .from('organizations')
    .select('id, name, default_currency')
    .eq('id', auth.orgId)
    .single()

  if (error || !org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    workspace: {
      id:       org.id,
      name:     org.name,
      currency: org.default_currency,
    },
  })
}
