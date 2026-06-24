'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { DownloadIcon } from 'lucide-react'

const PRESETS = [
  { value: 'this_month',   label: 'This month' },
  { value: 'last_month',   label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'this_year',    label: 'This year' },
  { value: 'last_year',    label: 'Last year' },
  { value: 'all',          label: 'All time' },
  { value: 'custom',       label: 'Custom range' },
]

const STATUSES = [
  { value: '',          label: 'All statuses' },
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Sent' },
  { value: 'viewed',    label: 'Viewed' },
  { value: 'partial',   label: 'Partial' },
  { value: 'paid',      label: 'Paid' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'void',      label: 'Void' },
]

interface ReportFiltersProps {
  clients: { id: string; name: string }[]
}

const SELECT_CLS =
  'h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

export function ReportFilters({ clients }: ReportFiltersProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const sp       = useSearchParams()

  const preset   = sp.get('preset')  ?? 'this_month'
  const from     = sp.get('from')    ?? ''
  const to       = sp.get('to')      ?? ''
  const clientId = sp.get('client')  ?? ''
  const status   = sp.get('status')  ?? ''

  const update = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(sp.toString())
    if (value) next.set(key, value)
    else        next.delete(key)
    next.delete('page')
    router.replace(`${pathname}?${next.toString()}`)
  }, [sp, pathname, router])

  const exportParams = new URLSearchParams()
  if (preset)   exportParams.set('preset', preset)
  if (from)     exportParams.set('from', from)
  if (to)       exportParams.set('to', to)
  if (clientId) exportParams.set('client', clientId)
  if (status)   exportParams.set('status', status)

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Period preset */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Period</label>
        <select value={preset} onChange={e => update('preset', e.target.value)} className={SELECT_CLS}>
          {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Custom date range */}
      {preset === 'custom' && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date" value={from}
              onChange={e => update('from', e.target.value)}
              className={SELECT_CLS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date" value={to}
              onChange={e => update('to', e.target.value)}
              className={SELECT_CLS}
            />
          </div>
        </>
      )}

      {/* Client filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Client</label>
        <select value={clientId} onChange={e => update('client', e.target.value)} className={SELECT_CLS}>
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Status filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <select value={status} onChange={e => update('status', e.target.value)} className={SELECT_CLS}>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Export */}
      <a href={`/api/reports/export?${exportParams.toString()}`} download>
        <Button variant="outline" size="sm" className="h-9">
          <DownloadIcon className="mr-2 h-3.5 w-3.5" /> Export CSV
        </Button>
      </a>
    </div>
  )
}
