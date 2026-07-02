import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPayPalSubscription, mapPayPalSub, PAYPAL_PLAN_IDS } from '@/lib/paypal'
import { BillingOverview } from '@/components/billing/billing-overview'
import type { Subscription } from '@/types/database'

export const metadata = { title: 'Billing — BillCraft AI' }

type SearchParams = {
  success?:           string
  cancelled?:         string
  subscription_id?:   string   // PayPal return
  paypal_cancelled?:  string   // PayPal checkout cancelled
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params   = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId   = userRecord.organization_id
  const isOwner = userRecord.role === 'owner'

  // Handle PayPal return after user approval
  let paypalActivated = false
  if (params.subscription_id && isOwner) {
    try {
      const paypalSub = await getPayPalSubscription(params.subscription_id)
      const customId  = String(paypalSub.custom_id ?? '')
      const [subOrgId, planKey, billingCycle] = customId.split('|')

      if (subOrgId === orgId && planKey && billingCycle) {
        const admin = createServiceClient()
        await admin.from('subscriptions').upsert(
          mapPayPalSub(paypalSub, orgId, planKey, billingCycle),
          { onConflict: 'organization_id', ignoreDuplicates: false },
        )
        paypalActivated = true
      }
    } catch (err) {
      console.error('[billing] PayPal subscription verification failed:', err)
    }
  }

  const [{ data: sub }, { data: org }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single(),
  ])

  // Pass plan IDs to the client (not secret — they're public PayPal plan identifiers)
  const paypalPlanIds = {
    basic:  { monthly: PAYPAL_PLAN_IDS.basic.monthly  ?? null, annual: PAYPAL_PLAN_IDS.basic.annual  ?? null },
    pro:    { monthly: PAYPAL_PLAN_IDS.pro.monthly    ?? null, annual: PAYPAL_PLAN_IDS.pro.annual    ?? null },
    agency: { monthly: PAYPAL_PLAN_IDS.agency.monthly ?? null, annual: PAYPAL_PLAN_IDS.agency.annual ?? null },
  }
  const paypalClientId = process.env.PAYPAL_CLIENT_ID ?? ''

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing &amp; Plans</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and upgrade your plan.
        </p>
      </div>
      <BillingOverview
        subscription={sub as Subscription | null}
        orgId={orgId}
        isOwner={isOwner}
        showSuccess={params.success === '1'}
        showCancelled={params.cancelled === '1'}
        showPayPalActivated={paypalActivated}
        showPayPalCancelled={params.paypal_cancelled === '1'}
        paypalPlanIds={paypalPlanIds}
        paypalClientId={paypalClientId}
        trialEndsAt={org?.trial_ends_at ?? null}
      />
    </div>
  )
}
