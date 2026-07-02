'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckIcon, Loader2, Zap, Building2, Clock, AlertTriangle, Star, AlertCircle,
} from 'lucide-react'
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js'
import { toast } from 'sonner'
import { PLANS, type PlanKey } from '@/lib/stripe'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Subscription } from '@/types/database'

interface PayPalPlanIds {
  basic:  { monthly: string | null; annual: string | null }
  pro:    { monthly: string | null; annual: string | null }
  agency: { monthly: string | null; annual: string | null }
}

interface BillingOverviewProps {
  subscription:        Subscription | null
  orgId:               string
  isOwner:             boolean
  showSuccess:         boolean
  showCancelled:       boolean
  showPayPalActivated: boolean
  showPayPalCancelled: boolean
  paypalPlanIds:       PayPalPlanIds
  paypalClientId:      string
  trialEndsAt:         string | null
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:    { label: 'Active',    className: 'bg-green-100 text-green-700 border-green-200'  },
  trialing:  { label: 'Pending',   className: 'bg-blue-100 text-blue-700 border-blue-200'     },
  past_due:  { label: 'Past due',  className: 'bg-red-100 text-red-700 border-red-200'        },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border'  },
  unpaid:    { label: 'Unpaid',    className: 'bg-red-100 text-red-700 border-red-200'        },
}

const PLAN_ICON: Record<string, React.ElementType> = {
  basic:  Star,
  pro:    Zap,
  agency: Building2,
}

export function BillingOverview({
  subscription,
  orgId,
  isOwner,
  showSuccess,
  showCancelled,
  showPayPalActivated,
  showPayPalCancelled,
  paypalPlanIds,
  paypalClientId,
  trialEndsAt,
}: BillingOverviewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [yearly, setYearly] = useState(false)

  useEffect(() => {
    if (showSuccess)         toast.success('Subscription activated — welcome aboard!')
    if (showCancelled)       toast.info('Checkout cancelled. Your plan was not changed.')
    if (showPayPalActivated) toast.success('PayPal subscription confirmed — welcome aboard!')
    if (showPayPalCancelled) toast.info('PayPal checkout cancelled. Your plan was not changed.')
  }, [showSuccess, showCancelled, showPayPalActivated, showPayPalCancelled])

  const currentPlanKey = subscription?.plan_name as PlanKey | undefined
  const currentPlan    = currentPlanKey ? PLANS[currentPlanKey] : null
  const hasActiveSub   = !!subscription && subscription.status === 'active'

  const now           = new Date()
  const trialEnd      = trialEndsAt ? new Date(trialEndsAt) : null
  const trialActive   = !hasActiveSub && !!trialEnd && trialEnd > now
  const trialExpired  = !hasActiveSub && !!trialEnd && trialEnd <= now
  const trialDaysLeft = trialActive
    ? Math.ceil((trialEnd!.getTime() - now.getTime()) / 86_400_000)
    : null

  const handleStripePortal = () => {
    startTransition(async () => {
      const res  = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Failed to open billing portal.')
        return
      }
      window.location.href = data.url
    })
  }

  const handlePayPalCancel = () => {
    if (!confirm(
      'Cancel your subscription?\n\n' +
      'Your access will continue until the end of the current billing period.'
    )) return

    startTransition(async () => {
      const res  = await fetch('/api/paypal/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to cancel subscription.')
        return
      }
      toast.success('Subscription cancelled. Access continues until period end.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">

      {/* ── Current Plan Card ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {trialExpired && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">Trial expired</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Your 2-month trial ended on <strong>{formatDate(trialEndsAt!)}</strong>.
                  Subscribe to a paid plan below to continue.
                </p>
              </div>
            </div>
          )}

          {trialActive && (
            <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">Trial period active</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <strong>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining</strong> — trial ends{' '}
                  <strong>{formatDate(trialEndsAt!)}</strong>. Limits: 1 client · 5 invoices/month.
                </p>
              </div>
            </div>
          )}

          {hasActiveSub && currentPlan ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = PLAN_ICON[currentPlanKey!] ?? Zap
                  return (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  )
                })()}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{currentPlan.name} plan</p>
                    {subscription!.status && (
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[subscription!.status]?.className ?? 'bg-muted text-muted-foreground'}`}>
                        {STATUS_BADGE[subscription!.status]?.label ?? subscription!.status}
                      </span>
                    )}
                    {subscription!.gateway === 'paypal' && (
                      <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">PayPal</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatCurrency(subscription!.amount, subscription!.currency)} /{' '}
                    {subscription!.billing_cycle === 'annual' ? 'year' : 'month'}
                    {subscription!.cancel_at_period_end ? (
                      <span className="ml-2 text-destructive">· Cancels {formatDate(subscription!.current_period_end)}</span>
                    ) : (
                      <span className="ml-2">· Renews {formatDate(subscription!.current_period_end)}</span>
                    )}
                  </p>
                </div>
              </div>

              {isOwner && (
                subscription!.gateway === 'paypal' ? (
                  <Button
                    variant="outline" size="sm"
                    onClick={handlePayPalCancel}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cancel subscription
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleStripePortal} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Manage subscription
                  </Button>
                )
              )}
            </div>
          ) : (
            !trialActive && !trialExpired && (
              <p className="text-sm text-muted-foreground">No active subscription.</p>
            )
          )}
        </CardContent>
      </Card>

      {/* ── Plan cards ───────────────────────────────────────────── */}
      <PayPalScriptProvider
        options={{
          clientId: paypalClientId,
          vault:    true,
          intent:   'subscription',
        }}
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              {hasActiveSub ? 'Change plan' : 'Choose a plan'}
            </p>

            {/* Monthly / Annual toggle */}
            <div className="flex items-center gap-3">
              <span className={`text-sm ${!yearly ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <button
                onClick={() => setYearly(!yearly)}
                aria-label="Toggle billing cycle"
                className="relative flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  background:  yearly ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  borderColor: yearly ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                }}
              >
                <span
                  className="absolute h-4 w-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: yearly ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${yearly ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                  Annual
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Save up to 17%
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {(Object.values(PLANS) as typeof PLANS[PlanKey][]).map((plan) => {
              const isCurrent = hasActiveSub && plan.key === currentPlanKey
              const ppIds     = paypalPlanIds[plan.key as PlanKey]
              const planId    = yearly ? ppIds?.annual : ppIds?.monthly
              const price     = yearly ? plan.annual : plan.monthly
              const period    = yearly ? '/year' : '/month'
              const Icon      = PLAN_ICON[plan.key] ?? Zap

              return (
                <div
                  key={plan.key}
                  className={`relative flex flex-col rounded-xl border bg-card p-6 transition-shadow ${
                    plan.key === 'pro' ? 'border-primary shadow-md' : 'border-border'
                  } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-600 px-3 py-0.5 text-[11px] font-semibold text-white">
                      Current plan
                    </div>
                  )}
                  {!isCurrent && plan.key === 'pro' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      Most popular
                    </div>
                  )}

                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold">{plan.name}</span>
                  </div>

                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tabular-nums">${price}</span>
                    <span className="text-sm text-muted-foreground">{period}</span>
                  </div>
                  {yearly ? (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Save ${Math.round(plan.monthly * 12 - plan.annual)}/year vs monthly
                    </p>
                  ) : (
                    <div className="mb-4" />
                  )}

                  <ul className="mb-6 flex-1 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <PlanCta
                    plan={plan}
                    planId={planId ?? null}
                    orgId={orgId}
                    isCurrent={isCurrent}
                    isOwner={isOwner}
                    yearly={yearly}
                  />
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Prices in USD. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>
      </PayPalScriptProvider>

      {!isOwner && (
        <p className="text-sm text-muted-foreground">
          Only the workspace owner can manage billing and upgrade plans.
        </p>
      )}
    </div>
  )
}

// ─── Per-plan CTA (needs to be inside PayPalScriptProvider) ──────────────────

function PlanCta({
  plan,
  planId,
  orgId,
  isCurrent,
  isOwner,
  yearly,
}: {
  plan:      typeof PLANS[PlanKey]
  planId:    string | null
  orgId:     string
  isCurrent: boolean
  isOwner:   boolean
  yearly:    boolean
}) {
  const [{ isPending }] = usePayPalScriptReducer()
  const [ppError, setPpError] = useState<string | null>(null)

  if (isCurrent) {
    return (
      <div className="w-full rounded-lg border border-border bg-muted py-2 text-center text-sm font-medium text-muted-foreground">
        Your current plan
      </div>
    )
  }

  if (!isOwner) {
    return (
      <Button variant="outline" disabled className="w-full">
        Owner only
      </Button>
    )
  }

  if (!planId) {
    return (
      <Button variant="outline" disabled className="w-full text-xs">
        Not available
      </Button>
    )
  }

  const customId = `${orgId}|${plan.key}|${yearly ? 'annual' : 'monthly'}`

  return (
    <div className="space-y-2">
      {ppError && (
        <div className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          {ppError}
        </div>
      )}

      {isPending ? (
        <div className="w-full animate-pulse rounded-lg bg-muted py-2.5 text-center text-xs text-muted-foreground">
          Loading PayPal…
        </div>
      ) : (
        <PayPalButtons
          style={{ layout: 'vertical', label: 'subscribe', height: 40 }}
          createSubscription={(_data, actions) => {
            setPpError(null)
            return actions.subscription.create({
              plan_id:   planId,
              custom_id: customId,
            })
          }}
          onApprove={async (data) => {
            // Redirect back to billing page — server will verify & activate
            window.location.href = `/billing?subscription_id=${data.subscriptionID}`
          }}
          onError={(err) => {
            console.error('PayPal error:', err)
            setPpError('Payment failed. Please try again or contact support.')
          }}
          onCancel={() => {
            window.location.href = '/billing?paypal_cancelled=1'
          }}
        />
      )}
    </div>
  )
}
