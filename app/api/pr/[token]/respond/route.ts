import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Accept-only — proformas.status has no declined value, unlike estimates.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  let body: { action?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (body.action !== 'accept') {
    return NextResponse.json({ error: 'action must be accept' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: proforma } = await supabase
    .from('proformas')
    .select('id, status')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (!proforma) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!['sent', 'viewed'].includes(proforma.status)) {
    return NextResponse.json({ error: 'Proforma is not open for response' }, { status: 409 })
  }

  const { error } = await supabase
    .from('proformas')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', proforma.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, status: 'accepted' })
}
