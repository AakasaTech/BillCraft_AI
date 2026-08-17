import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  DollarSign, TrendingUp, TrendingDown, FileText,
  PlusIcon, AlertTriangle, ClipboardList,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RevenueChart, type RevenueDataPoint } from '@/components/dashboard/revenue-chart'
import { InvoiceBreakdown, type BreakdownItem } from '@/components/dashboard/invoice-breakdown'
import { TopClients, type TopClient } from '@/components/dashboard/top-clients'
import { MetricStrip } from '@/components/dashboard/metric-strip'
import { EstimatesWidget, type EstimateWidgetItem } from '@/components/dashboard/estimates-widget'
import type { InvoiceStatus, EstimateStatus } from '@/types/database'

export const metadata: Metadata = { title: 'Dashboard — BillCraft AI' }

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
  draft:            'secondary',
  pending_approval: 'warning',
  sent:      'default',
  viewed:    'info',
  partial:   'warning',
  paid:      'success',
  overdue:   'destructive',
  cancelled: 'outline',
  void:      'outline',
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtCompact(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
    }).format(value)
  } catch { return `${value}` }
}

function trendLabel(thisMonth: number, lastMonth: number): { pct: number | null; up: boolean } {
  if (lastMonth === 0) return { pct: thisMonth > 0 ? 100 : null, up: true }
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  return { pct, up: pct >= 0 }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  // Date boundaries
  const now           = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
  const thisYearStart  = `${now.getFullYear()}-01-01`
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10)

  const [
    { data: orgData },
    // KPI: revenue
    { data: thisMonthPaid },
    { data: lastMonthPaid },
    { data: ytdPaid },
    { data: paidAll },
    // KPI: outstanding + overdue
    { data: outstanding },
    { data: overdueRows },
    // Charts + lists
    { data: recentInvoices },
    { data: paidTrend },
    { data: allInvoicesStatus },
    { data: paidByClient },
    // Analytics
    { data: paidWithDates },
    { data: allActionable },
    // Expenses
    { data: expensesRaw },
    // Estimates
    { data: estimateStatuses },
    { data: recentEstimatesRaw },
  ] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),

    // This month revenue
    supabase.from('invoices').select('*')
      .eq('organization_id', orgId).eq('status', 'paid').is('deleted_at', null)
      .gte('issue_date', thisMonthStart),

    // Last month revenue
    supabase.from('invoices').select('*')
      .eq('organization_id', orgId).eq('status', 'paid').is('deleted_at', null)
      .gte('issue_date', lastMonthStart).lte('issue_date', lastMonthEnd),

    // YTD revenue
    supabase.from('invoices').select('*')
      .eq('organization_id', orgId).eq('status', 'paid').is('deleted_at', null)
      .gte('issue_date', thisYearStart),

    // All-time paid (for avg value)
    supabase.from('invoices').select('*')
      .eq('organization_id', orgId).eq('status', 'paid').is('deleted_at', null),

    // Outstanding (sent + viewed + partial)
    supabase.from('invoices').select('*')
      .eq('organization_id', orgId).is('deleted_at', null)
      .in('status', ['sent', 'viewed', 'partial']),

    // Overdue: amount + count
    supabase.from('invoices').select('id, invoice_number, total, currency, due_date, clients(name)')
      .eq('organization_id', orgId).eq('status', 'overdue').is('deleted_at', null)
      .order('due_date', { ascending: true }).limit(5),

    // Recent 5 invoices
    supabase.from('invoices')
      .select('id, invoice_number, total, status, currency, due_date, clients(name)')
      .eq('organization_id', orgId).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(5),

    // Revenue trend (12m)
    supabase.from('invoices').select('*')
      .eq('organization_id', orgId).eq('status', 'paid').is('deleted_at', null)
      .gte('issue_date', twelveMonthsAgo),

    // Status breakdown
    supabase.from('invoices').select('*')
      .eq('organization_id', orgId).is('deleted_at', null),

    // Revenue by client
    supabase.from('invoices').select('total, client_id, clients(name)')
      .eq('organization_id', orgId).eq('status', 'paid').is('deleted_at', null),

    // Avg days to pay: invoices with both sent_at and paid_at
    supabase.from('invoices').select('*')
      .eq('organization_id', orgId).eq('status', 'paid').is('deleted_at', null)
      .not('sent_at', 'is', null).not('paid_at', 'is', null),

    // All actionable invoices (for collection rate)
    supabase.from('invoices').select('*')
      .eq('organization_id', orgId).is('deleted_at', null)
      .in('status', ['paid', 'sent', 'viewed', 'partial', 'overdue']),

    // Expenses by month (for chart)
    supabase.from('expenses').select('*')
      .eq('organization_id', orgId).is('deleted_at', null)
      .gte('date', twelveMonthsAgo),

    // Estimate statuses
    supabase.from('estimates').select('*')
      .eq('organization_id', orgId).is('deleted_at', null),

    // Recent estimates
    supabase.from('estimates')
      .select('id, estimate_number, status, total, currency, clients(name)')
      .eq('organization_id', orgId).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(5),
  ])

  // Explicit casts for join queries (avoids TypeScript instantiation-depth errors)
  type OverdueInvoice = { id: string; invoice_number: string; total: number; currency: string; due_date: string | null; clients: { name: string } | null }
  type RecentInvoice  = { id: string; invoice_number: string; total: number; status: string; currency: string; due_date: string | null; clients: { name: string } | null }
  type PaidByClient   = { total: number; client_id: string; clients: { name: string } | null }
  type RecentEstimate = { id: string; estimate_number: string; status: string; total: number; currency: string; clients: { name: string } | null }

  const overdueRowsCast      = overdueRows      as OverdueInvoice[] | null
  const recentInvoicesCast   = recentInvoices   as RecentInvoice[]  | null
  const paidByClientCast     = paidByClient     as PaidByClient[]   | null
  const recentEstimatesRawCast = recentEstimatesRaw as RecentEstimate[] | null

  const currency = orgData?.default_currency ?? 'USD'
  const orgName  = orgData?.name ?? 'your workspace'

  // ── KPI computations ─────────────────────────────────────────────────────────
  const thisMonthRevenue = (thisMonthPaid ?? []).reduce((s, i) => s + i.total, 0)
  const lastMonthRevenue = (lastMonthPaid ?? []).reduce((s, i) => s + i.total, 0)
  const ytdRevenue       = (ytdPaid       ?? []).reduce((s, i) => s + i.total, 0)
  const totalRevenue     = (paidAll       ?? []).reduce((s, i) => s + i.total, 0)
  const totalOutstanding = (outstanding   ?? []).reduce((s, i) => s + i.total, 0)
  const overdueTotal     = (overdueRowsCast   ?? []).reduce((s, i) => s + i.total, 0)

  const { pct: trendPct, up: trendUp } = trendLabel(thisMonthRevenue, lastMonthRevenue)

  // ── Analytics strip ───────────────────────────────────────────────────────────
  // Collection rate
  const actionableCount = (allActionable ?? []).length
  const paidCount       = (allActionable ?? []).filter(i => i.status === 'paid').length
  const collectionRate  = actionableCount > 0 ? Math.round((paidCount / actionableCount) * 100) : null

  // Avg invoice value
  const avgInvoiceValue = paidCount > 0 ? totalRevenue / paidCount : null

  // Avg days to pay
  let avgDaysToPay: number | null = null
  if ((paidWithDates ?? []).length > 0) {
    const days = (paidWithDates ?? [])
      .map(inv => {
        const sent = new Date(inv.sent_at!).getTime()
        const paid = new Date(inv.paid_at!).getTime()
        return (paid - sent) / 86_400_000
      })
      .filter(d => d >= 0)
    if (days.length > 0) {
      avgDaysToPay = Math.round(days.reduce((s, d) => s + d, 0) / days.length)
    }
  }

  // ── Revenue trend (12 months) ─────────────────────────────────────────────────
  const revenueByMonth:  Record<string, number> = {}
  const expensesByMonth: Record<string, number> = {}
  for (let m = 11; m >= 0; m--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    revenueByMonth[key]  = 0
    expensesByMonth[key] = 0
  }
  for (const inv of paidTrend ?? []) {
    const key = inv.issue_date.slice(0, 7)
    if (key in revenueByMonth) revenueByMonth[key] = (revenueByMonth[key] ?? 0) + inv.total
  }
  for (const exp of expensesRaw ?? []) {
    const key = (exp.date as string).slice(0, 7)
    if (key in expensesByMonth) expensesByMonth[key] = (expensesByMonth[key] ?? 0) + exp.amount
  }
  const revenueData: RevenueDataPoint[] = Object.entries(revenueByMonth).map(([key, revenue]) => {
    const month = key.slice(5, 7)
    return {
      month:    MONTH_NAMES[parseInt(month, 10) - 1] ?? month,
      revenue,
      expenses: expensesByMonth[key] ?? 0,
    }
  })

  // ── Status breakdown ──────────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {}
  for (const inv of allInvoicesStatus ?? []) {
    statusCounts[inv.status] = (statusCounts[inv.status] ?? 0) + 1
  }
  const ALL_STATUSES = ['draft','sent','viewed','partial','paid','overdue','cancelled','void']
  const breakdownData: BreakdownItem[] = ALL_STATUSES.map(status => ({
    status, count: statusCounts[status] ?? 0,
  }))

  // ── Top clients ───────────────────────────────────────────────────────────────
  const clientRevMap: Record<string, { name: string; revenue: number; invoices: number }> = {}
  for (const inv of paidByClientCast ?? []) {
    const cid  = inv.client_id
    const name = inv.clients?.name ?? 'Unknown'
    if (!clientRevMap[cid]) clientRevMap[cid] = { name, revenue: 0, invoices: 0 }
    clientRevMap[cid].revenue  += inv.total
    clientRevMap[cid].invoices += 1
  }
  const topClients: TopClient[] = Object.entries(clientRevMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // ── Estimates ─────────────────────────────────────────────────────────────────
  const estStatusCounts: Record<string, number> = {}
  for (const e of estimateStatuses ?? []) {
    estStatusCounts[e.status] = (estStatusCounts[e.status] ?? 0) + 1
  }
  const pendingEstimates  = (estStatusCounts['sent']     ?? 0) + (estStatusCounts['viewed'] ?? 0)
  const acceptedEstimates = estStatusCounts['accepted']  ?? 0
  const declinedEstimates = estStatusCounts['declined']  ?? 0

  const recentEstimates: EstimateWidgetItem[] = (recentEstimatesRawCast ?? []).map(e => ({
    id:              e.id,
    estimate_number: e.estimate_number,
    client_name:     e.clients?.name ?? '—',
    total:           e.total,
    currency:        e.currency,
    status:          e.status as EstimateStatus,
  }))

  // ── Analytics strip items ─────────────────────────────────────────────────────
  const metricItems = [
    {
      label: 'Collection rate',
      value: collectionRate !== null ? `${collectionRate}%` : '—',
      sub:   'of sent invoices paid',
    },
    {
      label: 'Avg. invoice value',
      value: avgInvoiceValue !== null ? fmtCompact(avgInvoiceValue, currency) : '—',
      sub:   `across ${paidCount} paid invoice${paidCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Avg. days to pay',
      value: avgDaysToPay !== null ? `${avgDaysToPay} days` : '—',
      sub:   'from send to payment',
    },
    {
      label: 'YTD Revenue',
      value: formatCurrency(ytdRevenue, currency),
      sub:   `Jan 1 – today`,
    },
  ]

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back to {orgName}.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/estimates/new">
              <ClipboardList className="mr-2 h-4 w-4" /> New estimate
            </Link>
          </Button>
          <Button asChild className="bc-btn-primary text-white border-0">
            <Link href="/invoices/new">
              <PlusIcon className="mr-2 h-4 w-4" /> New invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* This month revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(thisMonthRevenue, currency)}</div>
            {trendPct !== null ? (
              <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-[var(--success)]' : 'text-destructive'}`}>
                {trendUp
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                {trendUp ? '+' : ''}{trendPct}% vs last month
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">No data last month</p>
            )}
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding, currency)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {(outstanding ?? []).length} invoice{(outstanding ?? []).length !== 1 ? 's' : ''} pending
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className={(overdueRowsCast?.length ?? 0) > 0 ? 'border-destructive/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            {(overdueRowsCast?.length ?? 0) > 0
              ? <AlertTriangle className="h-4 w-4 text-destructive" />
              : <AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(overdueRowsCast?.length ?? 0) > 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(overdueTotal, currency)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {(overdueRowsCast?.length ?? 0)} invoice{(overdueRowsCast?.length ?? 0) !== 1 ? 's' : ''} overdue
            </p>
          </CardContent>
        </Card>

        {/* Pending estimates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open estimates</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEstimates}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {acceptedEstimates} accepted · {declinedEstimates} declined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics strip */}
      <MetricStrip items={metricItems} />

      {/* Revenue chart + Status breakdown */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Expenses (last 12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceBreakdown data={breakdownData} />
          </CardContent>
        </Card>
      </div>

      {/* Top clients + Estimates widget */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top clients by revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <TopClients clients={topClients} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Estimates</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/estimates/new">New estimate</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <EstimatesWidget
              pending={pendingEstimates}
              accepted={acceptedEstimates}
              declined={declinedEstimates}
              estimates={recentEstimates}
            />
          </CardContent>
        </Card>
      </div>

      {/* Overdue + Recent invoices */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Overdue invoices</CardTitle>
            {(overdueRowsCast?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdueRowsCast!.length} overdue
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {(overdueRowsCast?.length ?? 0) === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No overdue invoices. Great work!</p>
            ) : (
              <div className="divide-y">
                {overdueRowsCast!.map(inv => {
                  const clientName = inv.clients?.name ?? '—'
                  const daysOverdue = inv.due_date
                    ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000)
                    : null
                  return (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{clientName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {daysOverdue !== null && daysOverdue > 0
                            ? `${daysOverdue}d overdue · ${inv.invoice_number}`
                            : inv.invoice_number}
                        </p>
                      </div>
                      <span className="ml-4 shrink-0 text-sm font-semibold text-destructive">
                        {formatCurrency(inv.total, inv.currency)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent invoices</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/invoices">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {(recentInvoicesCast?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
                <Button size="sm" asChild>
                  <Link href="/invoices/new">
                    <PlusIcon className="mr-2 h-4 w-4" /> Create your first invoice
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {recentInvoicesCast!.map(inv => {
                  const clientName = inv.clients?.name ?? '—'
                  return (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{inv.invoice_number}</p>
                        <p className="truncate text-xs text-muted-foreground">{clientName}</p>
                      </div>
                      <div className="ml-4 flex shrink-0 items-center gap-3">
                        {inv.due_date && (
                          <span className="hidden text-xs text-muted-foreground sm:block">
                            Due {formatDate(inv.due_date)}
                          </span>
                        )}
                        <Badge variant={STATUS_VARIANT[inv.status as InvoiceStatus] ?? 'outline'}>
                          {inv.status}
                        </Badge>
                        <span className="text-sm font-semibold">
                          {formatCurrency(inv.total, inv.currency)}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
