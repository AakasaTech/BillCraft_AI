'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { updateReminderSettings } from '@/app/actions/reminder-settings'

const OFFSET_OPTIONS: { value: number; label: string; group: 'before' | 'on' | 'after' }[] = [
  { value: -7,  label: '7 days before due',  group: 'before' },
  { value: -3,  label: '3 days before due',  group: 'before' },
  { value: -1,  label: '1 day before due',   group: 'before' },
  { value:  0,  label: 'On the due date',    group: 'on'     },
  { value:  1,  label: '1 day after due',    group: 'after'  },
  { value:  3,  label: '3 days after due',   group: 'after'  },
  { value:  7,  label: '7 days after due',   group: 'after'  },
  { value: 14,  label: '14 days after due',  group: 'after'  },
  { value: 30,  label: '30 days after due',  group: 'after'  },
]

interface ReminderSettingsProps {
  initialEnabled: boolean
  initialOffsets: number[]
  canEdit:        boolean
}

export function ReminderSettings({ initialEnabled, initialOffsets, canEdit }: ReminderSettingsProps) {
  const [enabled, setEnabled]   = useState(initialEnabled)
  const [offsets, setOffsets]   = useState<Set<number>>(new Set(initialOffsets))
  const [error,   setError]     = useState<string | null>(null)
  const [saved,   setSaved]     = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggleOffset(value: number) {
    setOffsets((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else                  next.add(value)
      return next
    })
    setSaved(false)
    setError(null)
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateReminderSettings(enabled, [...offsets])
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  const groups = [
    { key: 'before', label: 'Before due date', options: OFFSET_OPTIONS.filter((o) => o.group === 'before') },
    { key: 'on',     label: 'On due date',      options: OFFSET_OPTIONS.filter((o) => o.group === 'on')     },
    { key: 'after',  label: 'After due date',   options: OFFSET_OPTIONS.filter((o) => o.group === 'after')  },
  ]

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Automatic payment reminders</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            BillCraft AI will email your clients automatically on the days you choose below.
            Reminders are sent once per day at 9:00 AM UTC.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => { setEnabled(v); setSaved(false); setError(null) }}
          disabled={!canEdit}
          aria-label="Enable automatic reminders"
        />
      </div>

      {/* Day picker — only shown when enabled */}
      {enabled && (
        <>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-4">Send reminders on these days</p>
            <div className="space-y-5">
              {groups.map(({ key, label, options }) => (
                <div key={key}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {label}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {options.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`offset-${opt.value}`}
                          checked={offsets.has(opt.value)}
                          onCheckedChange={() => toggleOffset(opt.value)}
                          disabled={!canEdit}
                        />
                        <Label htmlFor={`offset-${opt.value}`} className="text-sm font-normal cursor-pointer">
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

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
