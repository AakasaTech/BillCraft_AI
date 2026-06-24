import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  let body: { action?: string; note?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { action, note } = body
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: estimate } = await supabase
    .from('estimates')
    .select('id, status')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!['sent', 'viewed'].includes(estimate.status)) {
    return NextResponse.json({ error: 'Estimate is not open for response' }, { status: 409 })
  }

  const newStatus = action === 'accept' ? 'accepted' : 'declined'

  const { error } = await supabase
    .from('estimates')
    .update({
      status:        newStatus,
      responded_at:  new Date().toISOString(),
      response_note: note || null,
    })
    .eq('id', estimate.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, status: newStatus })
}
