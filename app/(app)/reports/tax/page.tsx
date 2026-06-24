import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { TaxFilters } from '@/components/reports/tax-filters'
import { getDateRange } from '@/lib/reports'

export const metadata: Metadata = { title: 'Tax Report — BillCraft AI' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaxGroup {
  tax_type: string
  tax_rate: number
  currency: string
  count:    number
  net:      number  // subtotal − discount (taxable base)
  tax:      number  // tax_amount
  gross:    number  // total
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TAX_TYPE_LABEL: Record<string, string> = {
  vat:       'VAT',
  gst:       'GST',
  sales_tax: 'Sales Tax',
  none:      'No Tax',
}

function fmtRate(rate: number): string {
  return rate === 0 ? '0%' : `${parseFloat(rate.toFixed(4))}%`
}

function groupKey(taxType: string, taxRate: number, currency: string): string {
  return `${taxType}|${taxRate}|${currency}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TaxReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams

  const preset    = (sp.preset as string | undefined) ?? 'this_year'
  const customFrom = sp.from  as string | undefined
  const customTo   = sp.to    as string | undefined
  const basis      = (sp.basis as string | undefined) ?? 'accrual'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId     = userRecord.organization_id
  const dateRange = getDateRange(preset, customFrom, customTo)

  const [{ data: orgData }, { data: rawRows }] = await Promise.all([
    supabase.from('organizations').select('default_currency').eq('id', orgId).single(),

    (() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('invoices')
        .select('tax_type, tax_rate, currency, subtotal, discount_amount, tax_amount, total')
        .eq('organization_id', orgId)
        .is('deleted_at', null)

      if (basis === 'cash') {
        // Cash basis: only paid invoices, filtered by paid_at
        q = q.eq('status', 'paid')
        if (dateRange.from) q = q.gte('paid_at', dateRange.from)
        if (dateRange.to)   q = q.lte('paid_at', dateRange.to   + 'T23:59:59.999Z')
      } else {
        // Accrual basis: all sent/billed invoices, filtered by issue_date
        q = q.not('status', 'in', '("draft","cancelled","void")')
        if (dateRange.from) q = q.gte('issue_date', dateRange.from)
        if (dateRange.to)   q = q.lte('issue_date', dateRange.to)
      }

      return q
    })(),
  ])

  const currency = orgData?.default_currency ?? 'USD'

  // ── Aggregate into groups ─────────────────────────────────────────────────
  const groupMap = new Map<string, TaxGroup>()

  for (const row of rawRows ?? []) {
    const key = groupKey(row.tax_type, Number(row.tax_rate), row.currency)
    if (!groupMap.has(key)) {
      groupMap.set(key, { tax_type: row.tax_type, tax_rate: Number(row.tax_rate), currency: row.currency, count: 0, net: 0, tax: 0, gross: 0 })
    }
    const g = groupMap.get(key)!
    g.count++
    g.net   += Number(row.subtotal) - Number(row.discount_amount)
    g.tax   += Number(row.tax_amount)
    g.gross += Number(row.total)
  }

  // Sort: taxed groups first (by tax desc), then zero-tax groups
  const groups = [...groupMap.values()].sort((a, b) => {
    if (a.tax_type === 'none' && b.tax_type !== 'none') return 1
    if (a.tax_type !== 'none' && b.tax_type === 'none') return -1
    return b.tax - a.tax
  })

  // Grand totals (only make sense when all rows share the same currency;
  // we use org default currency as the display currency)
  const totals = groups
    .filter(g => g.currency === currency)
    .reduce(
      (acc, g) => ({ count: acc.count + g.count, net: acc.net + g.net, tax: acc.tax + g.tax, gross: acc.gross + g.gross }),
      { count: 0, net: 0, tax: 0, gross: 0 },
    )

  const hasMultiCurrency = groups.some(g => g.currency !== currency)

  // Build export URL preserving current filters
  const exportParams = new URLSearchParams()
  if (preset !== 'this_year') exportParams.set('preset', preset)
  if (customFrom)             exportParams.set('from', customFrom)
  if (customTo)               exportParams.set('to', customTo)
  if (basis !== 'accrual')    exportParams.set('basis', basis)
  const exportUrl = `/api/reports/tax-export?${exportParams.toString()}`

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2 text-muted-foreground" asChild>
              <Link href="/reports">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Reports
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Tax Summary</h1>
          <p className="text-sm text-muted-foreground">
            {basis === 'cash' ? 'Cash basis — payment date' : 'Accrual basis — invoice date'}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={exportUrl} download>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-9 animate-pulse rounded-md bg-muted w-80" />}>
        <TaxFilters />
      </Suspense>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Net (taxable)',  value: formatCurrency(totals.net,   currency), sub: 'Before tax' },
          { label: 'Tax collected',  value: formatCurrency(totals.tax,   currency), sub: 'Total tax billed' },
          { label: 'Gross revenue',  value: formatCurrency(totals.gross, currency), sub: 'Including tax' },
          { label: 'Invoices',       value: String(totals.count),                   sub: basis === 'cash' ? 'Paid invoices' : 'Billed invoices' },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdown table */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No invoices found for the selected period and basis.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-base">Tax breakdown</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Tax type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Currency</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Invoices</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Net amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Tax amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Gross</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groups.map((g, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium">
                      {TAX_TYPE_LABEL[g.tax_type] ?? g.tax_type}
                    </td>
                    <td className="px-6 py-3 tabular-nums">{fmtRate(g.tax_rate)}</td>
                    <td className="px-6 py-3 font-mono text-xs">{g.currency}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{g.count}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{formatCurrency(g.net,   g.currency)}</td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium">
                      {g.tax > 0
                        ? formatCurrency(g.tax, g.currency)
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-semibold">
                      {formatCurrency(g.gross, g.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {!hasMultiCurrency && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/30">
                    <td colSpan={3} className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Total
                    </td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums">{totals.count}</td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums">{formatCurrency(totals.net,   currency)}</td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums">{formatCurrency(totals.tax,   currency)}</td>
                    <td className="px-6 py-3 text-right font-bold    tabular-nums">{formatCurrency(totals.gross, currency)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {hasMultiCurrency && (
            <div className="border-t px-6 py-2.5">
              <p className="text-xs text-muted-foreground">
                Multiple currencies detected. Totals shown in {currency} only. Export CSV for full breakdown.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
