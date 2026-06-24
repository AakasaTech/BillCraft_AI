import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/utils'

export const runtime = 'nodejs'

const bodySchema = z.object({
  priceId:      z.string().min(1),
  billingCycle: z.enum(['monthly', 'annual']),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRecord } = await supabase
      .from('users').select('organization_id').eq('id', user.id).single()
    if (!userRecord?.organization_id)
      return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const orgId = userRecord.organization_id

    const { data: org } = await supabase
      .from('organizations').select('name').eq('id', orgId).single()

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    // Reuse existing Stripe customer if one exists for this org
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('gateway_customer_id')
      .eq('organization_id', orgId)
      .not('gateway_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let customerId = sub?.gateway_customer_id ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        name:     org?.name,
        email:    user.email,
        metadata: { org_id: orgId, user_id: user.id },
      })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      customer:              customerId,
      mode:                  'subscription',
      line_items:            [{ price: parsed.data.priceId, quantity: 1 }],
      success_url:           absoluteUrl('/billing?success=1'),
      cancel_url:            absoluteUrl('/billing?cancelled=1'),
      subscription_data:     { metadata: { org_id: orgId } },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[stripe/checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
