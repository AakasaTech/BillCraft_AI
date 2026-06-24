import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPayPalSubscription, PAYPAL_PLAN_IDS } from '@/lib/paypal'
import { PLANS, type PlanKey } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id) return NextResponse.json({ error: 'Not found' },  { status: 404 })
  if (userRecord.role !== 'owner')  return NextResponse.json({ error: 'Owner only' }, { status: 403 })

  let body: { planKey?: string; billingCycle?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const { planKey, billingCycle } = body
  if (!planKey || !(planKey in PLANS))              return NextResponse.json({ error: 'Invalid plan' },          { status: 400 })
  if (billingCycle !== 'monthly' && billingCycle !== 'annual') return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })

  const planIds = PAYPAL_PLAN_IDS[planKey as PlanKey]
  const planId  = planIds?.[billingCycle]
  if (!planId) return NextResponse.json({ error: 'PayPal plan not configured for this tier' }, { status: 500 })

  const orgId    = userRecord.organization_id
  const customId = `${orgId}|${planKey}|${billingCycle}`

  const origin = req.headers.get('origin')
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? 'http://localhost:3000'

  try {
    const sub = await createPayPalSubscription({
      planId,
      customId,
      returnUrl: `${origin}/billing`,
      cancelUrl: `${origin}/billing?paypal_cancelled=1`,
    })

    const approveLink = sub.links.find(l => l.rel === 'approve')
    if (!approveLink) throw new Error('No approval link in PayPal response')

    return NextResponse.json({ url: approveLink.href })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create PayPal subscription'
    console.error('[paypal/create-subscription]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
