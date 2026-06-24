import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { cancelPayPalSubscription } from '@/lib/paypal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id) return NextResponse.json({ error: 'Not found' },  { status: 404 })
  if (userRecord.role !== 'owner')  return NextResponse.json({ error: 'Owner only' }, { status: 403 })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('gateway_subscription_id, gateway, status')
    .eq('organization_id', userRecord.organization_id)
    .eq('gateway', 'paypal')
    .eq('status', 'active')
    .maybeSingle()

  if (!sub?.gateway_subscription_id) {
    return NextResponse.json({ error: 'No active PayPal subscription found' }, { status: 404 })
  }

  try {
    await cancelPayPalSubscription(sub.gateway_subscription_id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to cancel PayPal subscription'
    console.error('[paypal/cancel]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Optimistically mark as cancelled; webhook will confirm
  const admin = createServiceClient()
  await admin
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('gateway_subscription_id', sub.gateway_subscription_id)

  return NextResponse.json({ success: true })
}
