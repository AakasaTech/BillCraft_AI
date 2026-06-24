'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Send, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/utils'
import { sendStatementAction } from '@/app/actions/send-statement'
import type { StatementEntry } from '@/lib/pdf/statement-pdf'

interface StatementViewProps {
  clientId:     string
  clientName:   string
  clientEmail:  string | null
  from:         string
  to:           string
  currency:     string
  entries:      StatementEntry[]
  totalCharged: number
  totalPaid:    number
  outstanding:  number
}

export function StatementView({
  clientId, clientName, clientEmail,
  from, to, currency, entries,
  totalCharged, totalPaid, outstanding,
}: StatementViewProps) {
  const router    = useRouter()
  const [fromVal, setFromVal] = useState(from)
  const [toVal,   setToVal]   = useState(to)
  const [isPending, startTransition] = useTransition()

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`?from=${fromVal}&to=${toVal}`)
  }

  const handleSend = () => {
    if (!clientEmail) { toast.error('Client has no email address.'); return }
    if (!confirm(`Send this statement to ${clientEmail}?`)) return
    startTransition(async () => {
      const result = await sendStatementAction(clientId, from, to)
      if (result.error) { toast.error(result.error); return }
      toast.success('Statement sent successfully.')
    })
  }

  const pdfUrl = `/api/clients/${clientId}/statement/pdf?from=${from}&to=${to}`

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/clients/${clientId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Account Statement</h1>
            <p className="text-sm text-muted-foreground">{clientName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={pdfUrl} download>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </a>
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isPending || !clientEmail}
            title={!clientEmail ? 'Client has no email address' : undefined}
          >
            {isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Send    className="mr-2 h-4 w-4" />}
            Send to client
          </Button>
        </div>
      </div>

      {/* Date range form */}
      <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={fromVal}
            onChange={e => setFromVal(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={toVal}
            onChange={e => setToVal(e.target.value)}
            className="w-40"
          />
        </div>
        <Button type="submit" variant="outline">Generate</Button>
      </form>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Total charged</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(totalCharged, currency)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Total paid</p>
          <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(totalPaid, currency)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className={`mt-1 text-xl font-bold ${outstanding > 0 ? 'text-orange-500' : 'text-green-600'}`}>
            {formatCurrency(outstanding, currency)}
          </p>
        </div>
      </div>

      {/* Statement table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <p className="font-semibold">Transactions</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(from)} – {formatDate(to)} · {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            No transactions in this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Charged</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry, i) => (
                  <tr key={i} className={entry.type === 'payment' ? 'bg-green-50/40 dark:bg-green-950/10' : ''}>
                    <td className="px-6 py-3 text-muted-foreground">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 font-medium">{entry.reference}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.description}</td>
                    <td className="px-4 py-3 text-right">
                      {entry.charged > 0 ? formatCurrency(entry.charged, currency) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {entry.paid > 0 ? formatCurrency(entry.paid, currency) : <span className="text-muted-foreground font-normal">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-primary">
                      {formatCurrency(entry.balance, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {entries.length > 0 && (
          <div className="border-t px-6 py-4">
            <Separator className="mb-4" />
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total charged</span>
                <span className="font-medium">{formatCurrency(totalCharged, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total paid</span>
                <span className="font-medium text-green-600">{formatCurrency(totalPaid, currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Outstanding</span>
                <span className={outstanding > 0 ? 'text-orange-500' : 'text-green-600'}>
                  {formatCurrency(outstanding, currency)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
