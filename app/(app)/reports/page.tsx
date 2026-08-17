import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ChevronLeft, ChevronRight, Download, BarChart3, Receipt, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ReportFilters } from '@/components/reports/report-filters'
import { getDateRange } from '@/lib/reports'
import type { InvoiceStatus } from '@/types/database'

export const metadata: Metadata = { title: 'Reports — BillCraft AI' }

const PAGE_SIZE = 25

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

function pageUrl(
  sp: Record<string, string | string[] | undefined>,
  p: number,
): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== 'page') params.set(k, Array.isArray(v) ? (v[0] ?? '') : v)
  }
  params.set('page', String(p))
  return `?${params.toString()}`
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams

  const preset     = (sp.preset  as string | undefined) ?? 'this_month'
  const customFrom = sp.from     as string | undefined
  const customTo   = sp.to       as string | undefined
  const clientId   = sp.client   as string | undefined
  const status     = sp.status   as string | undefined
  const page       = Math.max(1, parseInt((sp.page as string | undefined) ?? '1', 10))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId     = userRecord.organization_id
  const dateRange = getDateRange(preset, customFrom, customTo)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(q: any): any {
    if (dateRange.from) q = q.gte('issue_date', dateRange.from)
    if (dateRange.to)   q = q.lte('issue_date', dateRange.to)
    if (clientId)       q = q.eq('client_id', clientId)
    if (status)         q = q.eq('status', status)
    return q
  }

  const [
    { data: clients },
    { data: orgData },
    { data: summaryRows },
    { data: invoices, count },
  ] = await Promise.all([
    supabase.from('clients').select('*')
      .eq('organization_id', orgId).is('deleted_at', null).order('name'),

    supabase.from('organizations').select('*').eq('id', orgId).single(),

    applyFilters(
      supabase.from('invoices').select('*')
        .eq('organization_id', orgId).is('deleted_at', null)
    ),

    applyFilters(
      supabase.from('invoices')
        .select('id, invoice_number, total, currency, status, issue_date, due_date, clients(name)', { count: 'exact' })
        .eq('organization_id', orgId).is('deleted_at', null)
    ).order('issue_date', { ascending: false })
     .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ])

  type ReportInvoice = { id: string; invoice_number: string; total: number; currency: string; status: string; issue_date: string; due_date: string | null; clients: { name: string } | null }

  const currency   = orgData?.default_currency ?? 'USD'
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Summary stats
  let totalInvoiced = 0, collected = 0, outstanding = 0
  for (const row of (summaryRows ?? []) as { total: number; status: string }[]) {
    if (['sent', 'viewed', 'partial', 'paid', 'overdue'].includes(row.status)) totalInvoiced += row.total
    if (row.status === 'paid') collected += row.total
    if (['sent', 'viewed', 'partial', 'overdue'].includes(row.status)) outstanding += row.total
  }

  // Build export URL from current filters (excluding pagination)
  const exportParams = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== 'page') exportParams.set(k, Array.isArray(v) ? (v[0] ?? '') : v)
  }
  const exportUrl = `/api/reports/export?${exportParams.toString()}`

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Filter, analyse, and export your invoice data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/reports/aging">
              <BarChart3 className="mr-2 h-4 w-4" />
              A/R Aging
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/reports/tax">
              <Receipt className="mr-2 h-4 w-4" />
              Tax Report
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/reports/pl">
              <TrendingUp className="mr-2 h-4 w-4" />
              P&amp;L
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={exportUrl} download>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      {/* Filters — useSearchParams requires Suspense */}
      <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted" />}>
        <ReportFilters clients={clients ?? []} />
      </Suspense>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total invoiced', value: formatCurrency(totalInvoiced, currency), desc: 'Sent, paid & overdue' },
          { label: 'Collected',      value: formatCurrency(collected, currency),      desc: 'Paid invoices' },
          { label: 'Outstanding',    value: formatCurrency(outstanding, currency),    desc: 'Unpaid invoices' },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {count ?? 0} invoice{(count ?? 0) === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(invoices?.length ?? 0) === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No invoices match the selected filters.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Invoice #</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Client</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Issue date</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Due date</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(invoices as ReportInvoice[] | null ?? []).map((inv) => {
                      const clientName = inv.clients?.name ?? '—'
                      return (
                        <tr key={inv.id} className="transition-colors hover:bg-muted/30">
                          <td className="px-6 py-3 font-medium">
                            <Link href={`/invoices/${inv.id}`} className="hover:underline">
                              {inv.invoice_number}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-muted-foreground">{clientName}</td>
                          <td className="px-6 py-3 text-muted-foreground">
                            {inv.issue_date ? formatDate(inv.issue_date) : '—'}
                          </td>
                          <td className="px-6 py-3 text-muted-foreground">
                            {inv.due_date ? formatDate(inv.due_date) : '—'}
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={STATUS_VARIANT[inv.status as InvoiceStatus] ?? 'outline'}>
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 text-right font-semibold">
                            {formatCurrency(inv.total, inv.currency)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-3">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} · {count} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild disabled={page <= 1}>
                      <Link href={pageUrl(sp, page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
                      <Link href={pageUrl(sp, page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
