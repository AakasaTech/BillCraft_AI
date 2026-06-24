import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TrialBannerProps {
  status:        'trial' | 'expired'
  trialDaysLeft: number | null
}

export function TrialBanner({ status, trialDaysLeft }: TrialBannerProps) {
  if (status === 'expired') {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Your trial has expired. New invoice and client creation is disabled.</span>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link href="/billing">Subscribe now</Link>
        </Button>
      </div>
    )
  }

  if (trialDaysLeft !== null && trialDaysLeft <= 7) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-warning/30 bg-warning/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-warning-foreground">
          <Clock className="h-4 w-4 shrink-0 text-warning" />
          <span>
            <strong>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left</strong> in your trial.
          </span>
        </div>
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link href="/billing">Upgrade</Link>
        </Button>
      </div>
    )
  }

  if (trialDaysLeft !== null) {
    return (
      <div className="flex items-center justify-between gap-4 border-b bg-muted/60 px-4 py-2">
        <p className="text-xs text-muted-foreground">
          Trial · {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining ·{' '}
          <span>1 client, 5 invoices/month</span>
        </p>
        <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
          <Link href="/billing">Upgrade</Link>
        </Button>
      </div>
    )
  }

  return null
}
