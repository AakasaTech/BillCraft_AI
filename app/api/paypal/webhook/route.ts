import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPayPalWebhook, getPayPalSubscription, mapPayPalSub } from '@/lib/paypal'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const rawBody = await req.text()

  const verified = await verifyPayPalWebhook({ headers: req.headers, rawBody })
  if (!verified) {
    console.warn('[paypal/webhook] signature verification failed')
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 })
  }

  let event: { event_type: string; resource: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { event_type, resource } = event

  try {
    switch (event_type) {

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED': {
        const customId   = String(resource.custom_id ?? '')
        const [orgId, planKey, billingCycle] = customId.split('|')
        if (!orgId || !planKey || !billingCycle) break

        const subData = await getPayPalSubscription(String(resource.id))
        await admin.from('subscriptions').upsert(
          mapPayPalSub(subData, orgId, planKey, billingCycle),
          { onConflict: 'organization_id', ignoreDuplicates: false },
        )
        break
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        await admin
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('gateway_subscription_id', String(resource.id))
        break
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'PAYMENT.SALE.DENIED': {
        await admin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('gateway_subscription_id', String(resource.id))
        break
      }

      case 'PAYMENT.SALE.COMPLETED': {
        // Renewal payment: refresh subscription details
        const billingAgreementId = resource.billing_agreement_id
        if (!billingAgreementId) break

        const subData  = await getPayPalSubscription(String(billingAgreementId))
        const customId = String(subData.custom_id ?? '')
        const [orgId, planKey, billingCycle] = customId.split('|')
        if (!orgId || !planKey || !billingCycle) break

        await admin.from('subscriptions').upsert(
          mapPayPalSub(subData, orgId, planKey, billingCycle),
          { onConflict: 'organization_id', ignoreDuplicates: false },
        )
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[paypal/webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
