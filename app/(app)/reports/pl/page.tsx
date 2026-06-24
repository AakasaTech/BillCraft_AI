import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Download, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import { TaxFilters } from '@/components/reports/tax-filters'
import { getDateRange } from '@/lib/reports'
import { EXPENSE_CATEGORY_LABEL } from '@/lib/expenses'

export const metadata: Metadata = { title: 'P&L Report — BillCraft AI' }

export default async function PLReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams

  const preset     = (sp.preset as string | undefined) ?? 'this_year'
  const customFrom = sp.from   as string | undefined
  const customTo   = sp.to     as string | undefined
  const basis      = (sp.basis as string | undefined) ?? 'accrual'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId     = userRecord.organization_id
  const dateRange = getDateRange(preset, customFrom, customTo)

  // ── Revenue query ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let revQ: any = supabase
    .from('invoices')
    .select('total, currency')
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  if (basis === 'cash') {
    revQ = revQ.eq('status', 'paid')
    if (dateRange.from) revQ = revQ.gte('paid_at', dateRange.from)
    if (dateRange.to)   revQ = revQ.lte('paid_at', dateRange.to + 'T23:59:59.999Z')
  } else {
    revQ = revQ.not('status', 'in', '("draft","cancelled","void")')
    if (dateRange.from) revQ = revQ.gte('issue_date', dateRange.from)
    if (dateRange.to)   revQ = revQ.lte('issue_date', dateRange.to)
  }

  // ── Expenses query ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let expQ: any = supabase
    .from('expenses')
    .select('amount, currency, category')
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  if (dateRange.from) expQ = expQ.gte('date', dateRange.from)
  if (dateRange.to)   expQ = expQ.lte('date', dateRange.to)

  const [
    { data: orgData },
    { data: invoiceRows },
    { data: expenseRows },
  ] = await Promise.all([
    supabase.from('organizations').select('default_currency').eq('id', orgId).single(),
    revQ,
    expQ,
  ])

  const currency = orgData?.default_currency ?? 'USD'

  // Aggregate revenue (default currency only)
  const revenue = ((invoiceRows ?? []) as { total: number; currency: string }[])
    .filter(r => r.currency === currency)
    .reduce((sum, r) => sum + Number(r.total), 0)

  // Aggregate expenses by category (default currency only)
  const catMap = new Map<string, number>()
  const expRows = (expenseRows ?? []) as { amount: number; currency: string; category: string }[]

  for (const row of expRows) {
    if (row.currency !== currency) continue
    catMap.set(row.category, (catMap.get(row.category) ?? 0) + Number(row.amount))
  }

  const totalExpenses = [...catMap.values()].reduce((s, v) => s + v, 0)
  const netProfit     = revenue - totalExpenses
  const margin        = revenue > 0 ? (netProfit / revenue) * 100 : 0

  const hasMultiCurrency =
    (invoiceRows ?? []).some((r: { currency: string }) => r.currency !== currency) ||
    expRows.some(r => r.currency !== currency)

  const categories = [...catMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amount]) => ({ cat, amount }))

  // Build export URL
  const exportParams = new URLSearchParams()
  if (preset !== 'this_year') exportParams.set('preset', preset)
  if (customFrom)             exportParams.set('from', customFrom)
  if (customTo)               exportParams.set('to', customTo)
  if (basis !== 'accrual')    exportParams.set('basis', basis)
  const exportUrl = `/api/reports/pl-export?${exportParams.toString()}`

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="-ml-2 h-7 px-2 text-muted-foreground" asChild>
              <Link href="/reports">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Reports
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Profit &amp; Loss</h1>
          <p className="text-sm text-muted-foreground">
            {basis === 'cash' ? 'Cash basis — payment date' : 'Accrual basis — invoice date'} · {currency}
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
      <Suspense fallback={<div className="h-9 w-80 animate-pulse rounded-md bg-muted" />}>
        <TaxFilters />
      </Suspense>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="px-4 pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{formatCurrency(revenue, currency)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {basis === 'cash' ? 'Payments received' : 'Invoices issued'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses, currency)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Total recorded expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={cn('text-2xl font-bold', netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
              {formatCurrency(netProfit, currency)}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              {netProfit >= 0
                ? <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                : <TrendingDown className="h-3 w-3 text-destructive" />}
              Revenue minus expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={cn('text-2xl font-bold', margin < 0 ? 'text-destructive' : '')}>
              {revenue > 0 ? `${margin.toFixed(1)}%` : '—'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Net ÷ Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense category breakdown */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No expenses recorded for the selected period.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-base">Expense breakdown</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-t bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">% of expenses</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map(({ cat, amount }) => (
                  <tr key={cat} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium">
                      {EXPENSE_CATEGORY_LABEL[cat] ?? cat}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      {formatCurrency(amount, currency)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                      {totalExpenses > 0 ? `${((amount / totalExpenses) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30">
                  <td className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total
                  </td>
                  <td className="px-6 py-3 text-right font-bold tabular-nums">
                    {formatCurrency(totalExpenses, currency)}
                  </td>
                  <td />
                </tr>
              </tfoot>
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
