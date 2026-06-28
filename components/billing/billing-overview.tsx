'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, Loader2, Zap, Building2, Clock, AlertTriangle, Star } from 'lucide-react'
import { toast } from 'sonner'
import { PLANS, type PlanKey } from '@/lib/stripe'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Subscription } from '@/types/database'

// Server passes booleans so no server-only env vars leak to the client bundle
interface PayPalConfigured {
  basic:  { monthly: boolean; annual: boolean }
  pro:    { monthly: boolean; annual: boolean }
  agency: { monthly: boolean; annual: boolean }
}

interface BillingOverviewProps {
  subscription:        Subscription | null
  isOwner:             boolean
  showSuccess:         boolean
  showCancelled:       boolean
  showPayPalActivated: boolean
  showPayPalCancelled: boolean
  paypalConfigured:    PayPalConfigured
  trialEndsAt:         string | null
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'warning' | 'success' | 'outline' }> = {
  active:    { label: 'Active',    variant: 'success'     },
  trialing:  { label: 'Pending',   variant: 'default'     },
  past_due:  { label: 'Past due',  variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline'     },
  unpaid:    { label: 'Unpaid',    variant: 'destructive' },
}

const PLAN_ICON: Record<string, React.ElementType> = {
  basic:  Star,
  pro:    Zap,
  agency: Building2,
}

export function BillingOverview({
  subscription,
  isOwner,
  showSuccess,
  showCancelled,
  showPayPalActivated,
  showPayPalCancelled,
  paypalConfigured,
  trialEndsAt,
}: BillingOverviewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

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

  const handlePayPalSubscribe = (planKey: string, billingCycle: 'monthly' | 'annual') => {
    startTransition(async () => {
      const res  = await fetch('/api/paypal/create-subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planKey, billingCycle }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Failed to start PayPal checkout.')
        return
      }
      window.location.href = data.url
    })
  }

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
    <div className="max-w-4xl space-y-8">

      {/* ── Current plan / trial status ─────────────────────────── */}
      <section className="rounded-xl border bg-card p-6">

        {trialExpired && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Trial expired</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your 2-month trial ended on <strong>{formatDate(trialEndsAt!)}</strong>.
                Subscribe to a paid plan to continue creating clients and invoices.
              </p>
            </div>
          </div>
        )}

        {trialActive && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Trial period</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <strong>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining</strong> — trial ends on{' '}
                <strong>{formatDate(trialEndsAt!)}</strong>.
                Limits: 1 client · 5 invoices/month.
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
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{currentPlan.name} plan</p>
                  <Badge variant={STATUS_BADGE[subscription!.status]?.variant ?? 'secondary'}>
                    {STATUS_BADGE[subscription!.status]?.label ?? subscription!.status}
                  </Badge>
                  {subscription!.gateway === 'paypal' && (
                    <Badge variant="outline" className="text-xs">PayPal</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(subscription!.amount, subscription!.currency)} /{' '}
                  {subscription!.billing_cycle === 'annual' ? 'year' : 'month'}
                  {subscription!.cancel_at_period_end ? (
                    <span className="ml-2 text-destructive">
                      · Cancels {formatDate(subscription!.current_period_end)}
                    </span>
                  ) : (
                    <span className="ml-2">
                      · Renews {formatDate(subscription!.current_period_end)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {isOwner && (
              subscription!.gateway === 'paypal' ? (
                <Button
                  variant="outline"
                  size="sm"
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
      </section>

      {/* ── Plan comparison (shown when no active sub) ──────────── */}
      {!hasActiveSub && (
        <section className="space-y-4">
          <p className="text-sm font-semibold">Choose a plan</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {(Object.values(PLANS) as typeof PLANS[PlanKey][]).map((plan) => {
              const isCurrent = hasActiveSub && plan.key === currentPlanKey
              const Icon      = PLAN_ICON[plan.key] ?? Zap
              const ppIds     = paypalConfigured[plan.key as PlanKey]

              return (
                <div
                  key={plan.key}
                  className={`relative flex flex-col rounded-xl border bg-card p-6 ${plan.key === 'pro' ? 'border-primary shadow-sm' : ''}`}
                >
                  {plan.key === 'pro' && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Most popular
                    </span>
                  )}

                  <div className="mb-4 flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{plan.name}</span>
                  </div>

                  <div className="mb-1">
                    <span className="text-3xl font-bold">
                      {(plan.monthly as number) === 0 ? 'Free' : `$${plan.monthly}`}
                    </span>
                    {plan.monthly > 0 && (
                      <span className="text-sm text-muted-foreground">/month</span>
                    )}
                  </div>
                  {plan.annual > 0 && (
                    <p className="mb-4 text-xs text-muted-foreground">
                      or ${plan.annual}/year — save {Math.round((1 - plan.annual / (plan.monthly * 12)) * 100)}%
                    </p>
                  )}
                  {(plan.monthly as number) === 0 && <div className="mb-4" />}

                  <ul className="mb-6 flex-1 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">Current plan</Button>
                  ) : !isOwner ? (
                    <Button variant="outline" disabled className="w-full" title="Only the owner can upgrade">
                      Owner only
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {ppIds?.monthly ? (
                        <Button
                          className="w-full"
                          onClick={() => handlePayPalSubscribe(plan.key, 'monthly')}
                          disabled={isPending}
                        >
                          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Get {plan.name} monthly
                        </Button>
                      ) : (
                        <Button className="w-full" disabled variant="outline">
                          PayPal plan not configured
                        </Button>
                      )}
                      {ppIds?.annual && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handlePayPalSubscribe(plan.key, 'annual')}
                          disabled={isPending}
                        >
                          Get {plan.name} annual
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!isOwner && (
        <p className="text-sm text-muted-foreground">
          Only the workspace owner can manage billing and upgrade plans.
        </p>
      )}
    </div>
  )
}
