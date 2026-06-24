const BASE = process.env.PAYPAL_API_URL ?? 'https://api-m.sandbox.paypal.com'

export const PAYPAL_PLAN_IDS = {
  basic: {
    monthly: process.env.PAYPAL_BASIC_MONTHLY_PLAN_ID  ?? null,
    annual:  process.env.PAYPAL_BASIC_ANNUAL_PLAN_ID   ?? null,
  },
  pro: {
    monthly: process.env.PAYPAL_PRO_MONTHLY_PLAN_ID    ?? null,
    annual:  process.env.PAYPAL_PRO_ANNUAL_PLAN_ID     ?? null,
  },
  agency: {
    monthly: process.env.PAYPAL_AGENCY_MONTHLY_PLAN_ID ?? null,
    annual:  process.env.PAYPAL_AGENCY_ANNUAL_PLAN_ID  ?? null,
  },
} as const

export type PayPalPlanKey = keyof typeof PAYPAL_PLAN_IDS

async function getToken(): Promise<string> {
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`)
  const data = await res.json()
  return data.access_token as string
}

export async function createPayPalSubscription(opts: {
  planId:    string
  customId:  string   // "orgId|planKey|billingCycle"
  returnUrl: string
  cancelUrl: string
}) {
  const token = await getToken()
  const res = await fetch(`${BASE}/v1/billing/subscriptions`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer:         'return=representation',
    },
    body: JSON.stringify({
      plan_id:   opts.planId,
      custom_id: opts.customId,
      application_context: {
        brand_name:          'BillCraft AI',
        locale:              'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action:         'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected:  'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? `PayPal subscription error: ${res.status}`)
  }

  return await res.json() as {
    id:     string
    status: string
    links:  Array<{ href: string; rel: string; method: string }>
  }
}

export async function getPayPalSubscription(id: string) {
  const token = await getToken()
  const res = await fetch(`${BASE}/v1/billing/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`PayPal getSubscription error: ${res.status}`)
  return await res.json() as Record<string, unknown>
}

export async function cancelPayPalSubscription(id: string, reason = 'Cancelled by user') {
  const token = await getToken()
  const res = await fetch(`${BASE}/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  })
  // 204 No Content = success
  if (res.status !== 204 && !res.ok) {
    throw new Error(`PayPal cancel error: ${res.status}`)
  }
}

export async function verifyPayPalWebhook(opts: {
  headers:   Headers
  rawBody:   string
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) return false

  const transmissionId   = opts.headers.get('paypal-transmission-id')
  const transmissionTime = opts.headers.get('paypal-transmission-time')
  const certUrl          = opts.headers.get('paypal-cert-url')
  const authAlgo         = opts.headers.get('paypal-auth-algo')
  const signature        = opts.headers.get('paypal-transmission-sig')

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !signature) return false

  try {
    const token = await getToken()
    const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id:   transmissionId,
        transmission_time: transmissionTime,
        cert_url:          certUrl,
        auth_algo:         authAlgo,
        transmission_sig:  signature,
        webhook_id:        webhookId,
        webhook_event:     JSON.parse(opts.rawBody),
      }),
    })
    if (!res.ok) return false
    const data = await res.json() as { verification_status: string }
    return data.verification_status === 'SUCCESS'
  } catch {
    return false
  }
}

// Maps a PayPal subscription resource to our subscriptions table row
export function mapPayPalSub(
  sub:          Record<string, unknown>,
  orgId:        string,
  planKey:      string,
  billingCycle: string,
) {
  const statusMap: Record<string, string> = {
    APPROVAL_PENDING: 'trialing',
    APPROVED:         'trialing',
    ACTIVE:           'active',
    SUSPENDED:        'past_due',
    CANCELLED:        'cancelled',
    EXPIRED:          'cancelled',
  }

  const billingInfo = sub.billing_info as Record<string, unknown> | undefined
  const lastAmt     = (billingInfo?.last_payment as Record<string, unknown> | undefined)
    ?.amount as Record<string, unknown> | undefined
  const amount    = lastAmt ? parseFloat(String(lastAmt.value))        : 0
  const currency  = lastAmt ? String(lastAmt.currency_code)            : 'USD'
  const payerId   = (sub.subscriber as Record<string, unknown> | undefined)?.payer_id
    ? String((sub.subscriber as Record<string, unknown>).payer_id)
    : null

  const startTime   = String(sub.start_time ?? sub.create_time ?? new Date().toISOString())
  const nextBilling = billingInfo?.next_billing_time
    ? String(billingInfo.next_billing_time)
    : new Date(Date.now() + 30 * 86_400_000).toISOString()

  return {
    organization_id:         orgId,
    gateway:                 'paypal' as const,
    gateway_subscription_id: String(sub.id),
    gateway_customer_id:     payerId,
    plan_name:               planKey,
    status:                  statusMap[String(sub.status)] ?? 'active',
    billing_cycle:           billingCycle as 'monthly' | 'annual',
    amount,
    currency,
    current_period_start:    startTime,
    current_period_end:      nextBilling,
    trial_end:               null,
    cancel_at_period_end:    false,
    cancelled_at:            String(sub.status) === 'CANCELLED' ? new Date().toISOString() : null,
  }
}
