import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'A/R Aging Report — BillCraft AI' }

// ─── Types ────────────────────────────────────────────────────────────────────

type BucketKey = 'current' | 'b1_30' | 'b31_60' | 'b61_90' | 'b91plus'

interface Buckets {
  current:  number
  b1_30:    number
  b31_60:   number
  b61_90:   number
  b91plus:  number
}

interface AgingInvoice {
  id:             string
  invoice_number: string
  due_date:       string | null
  amount_due:     number
  currency:       string
  bucket:         BucketKey
  days_overdue:   number
}

interface ClientRow {
  client_id:   string
  client_name: string
  buckets:     Buckets
  total:       number
  invoices:    AgingInvoice[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyBucket(dueDate: string | null, todayMs: number): { bucket: BucketKey; daysOverdue: number } {
  if (!dueDate) return { bucket: 'current', daysOverdue: 0 }
  const dueMs      = new Date(dueDate + 'T00:00:00Z').getTime()
  const daysOverdue = Math.floor((todayMs - dueMs) / 86_400_000)
  if (daysOverdue <= 0)  return { bucket: 'current',  daysOverdue: 0 }
  if (daysOverdue <= 30) return { bucket: 'b1_30',    daysOverdue }
  if (daysOverdue <= 60) return { bucket: 'b31_60',   daysOverdue }
  if (daysOverdue <= 90) return { bucket: 'b61_90',   daysOverdue }
  return { bucket: 'b91plus', daysOverdue }
}

function emptyBuckets(): Buckets {
  return { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b91plus: 0 }
}

function sumBuckets(b: Buckets): number {
  return b.current + b.b1_30 + b.b31_60 + b.b61_90 + b.b91plus
}

// ─── Bucket columns config ────────────────────────────────────────────────────

const COLUMNS: { key: BucketKey; label: string; sublabel: string }[] = [
  { key: 'current',  label: 'Current',    sublabel: 'Not yet due' },
  { key: 'b1_30',   label: '1–30 days',  sublabel: 'Overdue'     },
  { key: 'b31_60',  label: '31–60 days', sublabel: 'Overdue'     },
  { key: 'b61_90',  label: '61–90 days', sublabel: 'Overdue'     },
  { key: 'b91plus', label: '90+ days',   sublabel: 'Overdue'     },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AgingReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: orgData }, { data: rawInvoices }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),

    supabase
      .from('invoices')
      .select('id, invoice_number, client_id, due_date, amount_due, currency, clients(id, name)')
      .eq('organization_id', orgId)
      .in('status', ['sent', 'viewed', 'partial', 'overdue'])
      .is('deleted_at', null)
      .gt('amount_due', 0),
  ])

  const currency = orgData?.default_currency ?? 'USD'

  // ── Build client rows ──────────────────────────────────────────────────────
  const today   = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  type AgingRawInvoice = { id: string; invoice_number: string; client_id: string; due_date: string | null; amount_due: number; currency: string; clients: { id: string; name: string } | null }
  const agingInvoices = rawInvoices as AgingRawInvoice[] | null

  const clientMap = new Map<string, ClientRow>()

  for (const inv of agingInvoices ?? []) {
    const client     = inv.clients
    const clientId   = client?.id   ?? inv.client_id
    const clientName = client?.name ?? 'Unknown client'
    const amount     = Number(inv.amount_due)

    const { bucket, daysOverdue } = classifyBucket(inv.due_date, todayMs)

    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, { client_id: clientId, client_name: clientName, buckets: emptyBuckets(), total: 0, invoices: [] })
    }
    const row = clientMap.get(clientId)!
    row.buckets[bucket] += amount
    row.total           += amount
    row.invoices.push({ id: inv.id, invoice_number: inv.invoice_number, due_date: inv.due_date, amount_due: amount, currency: inv.currency, bucket, days_overdue: daysOverdue })
  }

  // Sort clients by total outstanding descending
  const clientRows = [...clientMap.values()].sort((a, b) => b.total - a.total)

  // Grand totals
  const grandTotal   = emptyBuckets()
  let   grandSum     = 0
  for (const row of clientRows) {
    for (const k of Object.keys(row.buckets) as BucketKey[]) grandTotal[k] += row.buckets[k]
    grandSum += row.total
  }

  const exportUrl = `/api/reports/aging-export`
  const asOf      = formatDate(today.toISOString(), 'en-US', { dateStyle: 'long' })

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
          <h1 className="text-2xl font-bold tracking-tight">A/R Aging Report</h1>
          <p className="text-sm text-muted-foreground">As of {asOf} · Outstanding receivables by age</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={exportUrl} download>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </div>

      {/* Summary bucket cards */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {COLUMNS.map((col) => {
          const amount = grandTotal[col.key]
          return (
            <Card key={col.key} className={col.key !== 'current' && amount > 0 ? 'border-destructive/30' : ''}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{col.label}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-lg font-bold ${col.key !== 'current' && amount > 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(amount, currency)}
                </p>
                <p className="text-xs text-muted-foreground">{col.sublabel}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Client breakdown table */}
      {clientRows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No outstanding receivables. All invoices are paid or current.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground w-48">Client</th>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right text-xs font-semibold text-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientRows.map((row) => (
                  <tr key={row.client_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium max-w-[12rem] truncate">
                      <Link href={`/clients/${row.client_id}`} className="hover:underline">
                        {row.client_name}
                      </Link>
                    </td>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-right tabular-nums">
                        {row.buckets[col.key] > 0
                          ? <span className={col.key !== 'current' ? 'text-destructive' : ''}>
                              {formatCurrency(row.buckets[col.key], currency)}
                            </span>
                          : <span className="text-muted-foreground/40">—</span>
                        }
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(row.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30">
                  <td className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total ({clientRows.length} client{clientRows.length === 1 ? '' : 's'})
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-right font-semibold tabular-nums">
                      {grandTotal[col.key] > 0
                        ? formatCurrency(grandTotal[col.key], currency)
                        : <span className="text-muted-foreground/40">—</span>
                      }
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right font-bold tabular-nums">
                    {formatCurrency(grandSum, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="border-t px-5 py-2.5">
            <p className="text-xs text-muted-foreground">
              Amounts shown in {currency}. Invoices in other currencies use raw amounts.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
