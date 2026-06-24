'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { PlusIcon, Send, Download, XCircle, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InvoiceStatusBadge } from './invoice-status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { bulkSendAction, bulkVoidAction } from '@/app/actions/bulk-invoices'

export type InvoiceRow = {
  id: string
  invoice_number: string
  status: string
  total: number
  currency: string
  issue_date: string
  due_date: string | null
  client_name: string
}

const STATUS_TABS = [
  { value: 'all',     label: 'All' },
  { value: 'draft',   label: 'Draft' },
  { value: 'sent',    label: 'Sent' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid',    label: 'Paid' },
]

const VOIDABLE = new Set(['sent', 'viewed', 'partial', 'overdue'])

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const [search,   setSearch]   = useState('')
  const [tab,      setTab]      = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [exportingIds, setExportingIds] = useState<Set<string>>(new Set())

  const filtered = invoices.filter((inv) => {
    const matchesTab    = tab === 'all' || inv.status === tab
    const q             = search.toLowerCase()
    const matchesSearch = !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.client_name.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const allFilteredIds    = filtered.map(i => i.id)
  const allSelected       = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected      = allFilteredIds.some(id => selected.has(id)) && !allSelected
  const selectedInView    = allFilteredIds.filter(id => selected.has(id))
  const selectedCount     = selectedInView.length

  const toggle = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); allFilteredIds.forEach(id => s.delete(id)); return s })
    } else {
      setSelected(prev => new Set([...prev, ...allFilteredIds]))
    }
  }

  const clearSelection = () => setSelected(new Set())

  const handleBulkSend = () => {
    startTransition(async () => {
      const result = await bulkSendAction(selectedInView)
      if (result.sent > 0) toast.success(`Sent ${result.sent} invoice${result.sent !== 1 ? 's' : ''}.`)
      if (result.skipped > 0) toast.info(`${result.skipped} skipped (no email or wrong status).`)
      if (result.failed > 0) toast.error(`${result.failed} failed to send.`)
      clearSelection()
    })
  }

  const handleBulkVoid = () => {
    const voidable = selectedInView.filter(id => {
      const inv = invoices.find(i => i.id === id)
      return inv && VOIDABLE.has(inv.status)
    })
    if (voidable.length === 0) { toast.info('No selected invoices can be voided.'); return }
    if (!confirm(`Void ${voidable.length} invoice${voidable.length !== 1 ? 's' : ''}? This cannot be undone.`)) return

    startTransition(async () => {
      const result = await bulkVoidAction(voidable)
      if (result.error) { toast.error(result.error); return }
      toast.success(`Voided ${result.voided} invoice${result.voided !== 1 ? 's' : ''}.`)
      clearSelection()
    })
  }

  const handleBulkExport = async () => {
    if (exportingIds.size > 0) return
    setExportingIds(new Set(selectedInView))
    try {
      for (const id of selectedInView) {
        const inv = invoices.find(i => i.id === id)
        const res = await fetch(`/api/invoices/${id}/pdf`)
        if (!res.ok) { toast.error(`Failed to export ${inv?.invoice_number ?? id}`); continue }
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `${inv?.invoice_number ?? id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        if (selectedInView.indexOf(id) < selectedInView.length - 1) {
          await new Promise(r => setTimeout(r, 400))
        }
      }
      toast.success(`Exported ${selectedInView.length} PDF${selectedInView.length !== 1 ? 's' : ''}.`)
    } finally {
      setExportingIds(new Set())
    }
  }

  const isExporting = exportingIds.size > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search by invoice # or client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button asChild>
          <Link href="/invoices/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            New invoice
          </Link>
        </Button>
      </div>

      {/* Bulk actions bar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/60 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} selected
          </span>
          <div className="mx-2 h-4 w-px bg-border" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkSend}
            disabled={isPending || isExporting}
          >
            {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
            Send emails
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkExport}
            disabled={isPending || isExporting}
          >
            {isExporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
            Export PDFs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleBulkVoid}
            disabled={isPending || isExporting}
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Void
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={clearSelection}
            disabled={isPending || isExporting}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => { setTab(v); clearSelection() }}>
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t.value === 'all' ? invoices.length : invoices.filter((i) => i.status === t.value).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Issued</TableHead>
                  <TableHead className="hidden md:table-cell">Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center text-sm text-muted-foreground">
                      {invoices.length === 0 ? (
                        <>
                          No invoices yet.{' '}
                          <Link href="/invoices/new" className="underline underline-offset-4 hover:text-foreground">
                            Create your first invoice
                          </Link>
                        </>
                      ) : 'No invoices match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer"
                      data-selected={selected.has(inv.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(inv.id)}
                          onCheckedChange={() => toggle(inv.id)}
                          aria-label={`Select ${inv.invoice_number}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/invoices/${inv.id}`} className="block font-medium hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <Link href={`/invoices/${inv.id}`} className="block">{inv.client_name}</Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Link href={`/invoices/${inv.id}`} className="block">
                          <InvoiceStatusBadge status={inv.status} />
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground text-sm md:table-cell">
                        <Link href={`/invoices/${inv.id}`} className="block">{formatDate(inv.issue_date)}</Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground text-sm md:table-cell">
                        <Link href={`/invoices/${inv.id}`} className="block">
                          {inv.due_date ? formatDate(inv.due_date) : '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <Link href={`/invoices/${inv.id}`} className="block">
                          {formatCurrency(inv.total, inv.currency)}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
