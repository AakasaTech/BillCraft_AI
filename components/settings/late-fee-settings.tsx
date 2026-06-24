'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { updateLateFeeSettings } from '@/app/actions/late-fee-settings'

const AFTER_DAYS_OPTIONS = [
  { value: 0,  label: 'Immediately (day after due date)' },
  { value: 1,  label: '1 day after due date' },
  { value: 3,  label: '3 days after due date' },
  { value: 7,  label: '7 days after due date' },
  { value: 14, label: '14 days after due date' },
  { value: 30, label: '30 days after due date' },
]

interface LateFeeSettingsProps {
  initialEnabled:    boolean
  initialPercentage: number
  initialAfterDays:  number
  canEdit:           boolean
}

export function LateFeeSettings({
  initialEnabled,
  initialPercentage,
  initialAfterDays,
  canEdit,
}: LateFeeSettingsProps) {
  const [enabled,    setEnabled]    = useState(initialEnabled)
  const [percentage, setPercentage] = useState(String(initialPercentage))
  const [afterDays,  setAfterDays]  = useState(initialAfterDays)
  const [error,      setError]      = useState<string | null>(null)
  const [saved,      setSaved]      = useState(false)
  const [isPending,  startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    const pct = parseFloat(percentage)
    if (isNaN(pct) || pct <= 0) {
      setError('Enter a valid percentage greater than 0.')
      return
    }
    startTransition(async () => {
      const result = await updateLateFeeSettings(enabled, pct, afterDays)
      if (result.error) setError(result.error)
      else              setSaved(true)
    })
  }

  return (
    <div className="space-y-5">
      {/* Master toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Automatic late fees</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automatically add a late payment fee as a line item to overdue invoices.
            Applied once per invoice by the daily cron at 7:00 AM UTC.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => { setEnabled(v); setSaved(false); setError(null) }}
          disabled={!canEdit}
          aria-label="Enable automatic late fees"
        />
      </div>

      {enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Fee percentage */}
          <div className="space-y-1.5">
            <Label htmlFor="late-fee-pct" className="text-sm">
              Fee percentage
            </Label>
            <div className="relative">
              <Input
                id="late-fee-pct"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={percentage}
                onChange={(e) => { setPercentage(e.target.value); setSaved(false); setError(null) }}
                disabled={!canEdit}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Applied to the invoice's outstanding amount.
            </p>
          </div>

          {/* After days */}
          <div className="space-y-1.5">
            <Label htmlFor="late-fee-days" className="text-sm">
              Apply after
            </Label>
            <Select
              value={String(afterDays)}
              onValueChange={(v) => { setAfterDays(Number(v)); setSaved(false); setError(null) }}
              disabled={!canEdit}
            >
              <SelectTrigger id="late-fee-days">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AFTER_DAYS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How long to wait before charging the fee.
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {canEdit && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
          {saved && !isPending && (
            <p className="text-sm text-muted-foreground">Saved.</p>
          )}
        </div>
      )}
    </div>
  )
}
