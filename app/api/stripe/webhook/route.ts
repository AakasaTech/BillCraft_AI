import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Raw body required for Stripe signature verification
export async function POST(request: Request) {
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[webhook] signature failed:', message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const admin = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode !== 'subscription') break

        const orgId      = session.metadata?.org_id
        const subId      = session.subscription as string
        const customerId = session.customer as string
        if (!orgId || !subId) break

        const subscription = await stripe.subscriptions.retrieve(subId, {
          expand: ['items.data.price.product'],
        })

        await upsertSubscription(admin, orgId, customerId, subscription)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id
        if (!orgId) break

        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        await upsertSubscription(admin, orgId, customerId, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await admin
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('gateway_subscription_id', subscription.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId   = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (!subId) break
        await admin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('gateway_subscription_id', subId)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type SupabaseAdmin = ReturnType<typeof createServiceClient>

async function upsertSubscription(
  admin:        SupabaseAdmin,
  orgId:        string,
  customerId:   string,
  subscription: Stripe.Subscription,
) {
  const item       = subscription.items.data[0]
  const price      = item?.price
  const product    = price?.product as Stripe.Product | undefined
  const planName   = (product?.metadata?.plan_key ?? 'pro') as string
  const cycle      = price?.recurring?.interval === 'year' ? 'annual' : 'monthly'
  const amount     = (price?.unit_amount ?? 0) / 100
  const currency   = (price?.currency ?? 'usd').toUpperCase()

  const statusMap: Record<Stripe.Subscription.Status, string> = {
    active:             'active',
    trialing:           'trialing',
    past_due:           'past_due',
    canceled:           'cancelled',
    unpaid:             'unpaid',
    incomplete:         'past_due',
    incomplete_expired: 'cancelled',
    paused:             'cancelled',
  }

  await admin.from('subscriptions').upsert(
    {
      organization_id:        orgId,
      gateway:                'stripe',
      gateway_subscription_id: subscription.id,
      gateway_customer_id:    customerId,
      plan_name:              planName,
      status:                 statusMap[subscription.status] ?? 'active',
      billing_cycle:          cycle,
      amount,
      currency,
      current_period_start:   new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end:     new Date(subscription.current_period_end   * 1000).toISOString(),
      trial_end:              subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      cancel_at_period_end:   subscription.cancel_at_period_end,
      cancelled_at:           subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    },
    { onConflict: 'organization_id', ignoreDuplicates: false },
  )
}
