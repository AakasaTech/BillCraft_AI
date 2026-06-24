'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const PRESETS = [
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'this_year',    label: 'This year'    },
  { value: 'last_year',    label: 'Last year'    },
  { value: 'this_month',   label: 'This month'   },
  { value: 'last_month',   label: 'Last month'   },
  { value: 'custom',       label: 'Custom range' },
  { value: 'all',          label: 'All time'     },
]

const SELECT_CLS =
  'h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

export function TaxFilters() {
  const router   = useRouter()
  const pathname = usePathname()
  const sp       = useSearchParams()

  const preset = sp.get('preset') ?? 'this_year'
  const from   = sp.get('from')   ?? ''
  const to     = sp.get('to')     ?? ''
  const basis  = sp.get('basis')  ?? 'accrual'

  const update = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(sp.toString())
    if (value) next.set(key, value)
    else        next.delete(key)
    router.replace(`${pathname}?${next.toString()}`)
  }, [sp, pathname, router])

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Period */}
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
            <input type="date" value={from} onChange={e => update('from', e.target.value)} className={SELECT_CLS} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input type="date" value={to} onChange={e => update('to', e.target.value)} className={SELECT_CLS} />
          </div>
        </>
      )}

      {/* Accounting basis */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Basis</label>
        <select value={basis} onChange={e => update('basis', e.target.value)} className={SELECT_CLS}>
          <option value="accrual">Accrual (invoice date)</option>
          <option value="cash">Cash (payment date)</option>
        </select>
      </div>
    </div>
  )
}
