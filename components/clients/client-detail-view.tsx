'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, PencilIcon, PlusIcon,
  Mail, Phone, MapPin, FileText, Link2, RefreshCw, BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ClientFormDialog } from './client-form-dialog'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { regeneratePortalTokenAction } from '@/app/actions/clients'
import type { Client, InvoiceStatus } from '@/types/database'

interface InvoiceRow {
  id: string
  invoice_number: string
  status: string
  issue_date: string
  due_date: string | null
  currency: string
  total: number
  amount_paid: number
  amount_due: number
}

interface Stats {
  totalInvoiced: number
  totalPaid:     number
  outstanding:   number
  currency:      string
}

interface ClientDetailViewProps {
  client:   Client
  invoices: InvoiceRow[]
  stats:    Stats
}

export function ClientDetailView({ client, invoices, stats }: ClientDetailViewProps) {
  const router    = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [portalToken, setPortalToken] = useState(client.portal_token)
  const [isPending, startTransition]  = useTransition()

  const portalUrl = portalToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${portalToken}`
    : null

  const copyPortalLink = () => {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl).then(() => {
      toast.success('Portal link copied to clipboard.')
    })
  }

  const handleRegenerate = () => {
    if (!confirm('Regenerate the portal link? The old link will stop working immediately.')) return
    startTransition(async () => {
      const result = await regeneratePortalTokenAction(client.id)
      if (result.error) { toast.error(result.error); return }
      setPortalToken(result.token ?? null)
      toast.success('Portal link regenerated.')
    })
  }

  const addressParts = [
    client.address_line1,
    client.address_line2,
    client.city,
    client.state,
    client.postal_code,
  ].filter(Boolean)
  const address = addressParts.join(', ')

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {client.email && (
              <p className="text-sm text-muted-foreground">{client.email}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {portalToken && (
            <>
              <Button variant="outline" size="sm" onClick={copyPortalLink}>
                <Link2 className="mr-2 h-4 w-4" /> Copy portal link
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={isPending}
                title="Regenerate portal link"
              >
                <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/clients/${client.id}/statement`}>
              <BarChart3 className="mr-2 h-4 w-4" /> Statement
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <PencilIcon className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button size="sm" asChild>
            <Link href="/invoices/new">
              <PlusIcon className="mr-2 h-4 w-4" /> New invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Invoices</p>
            <p className="mt-1 text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total invoiced</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.totalInvoiced, stats.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total paid</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: 'oklch(0.527 0.154 150.069)' }}>
              {formatCurrency(stats.totalPaid, stats.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: 'oklch(0.646 0.222 41.116)' }}>
              {formatCurrency(stats.outstanding, stats.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Contact info */}
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>

          {client.email && (
            <div className="flex items-start gap-3 text-sm">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="break-all hover:underline">{client.email}</a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-start gap-3 text-sm">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{client.phone}</span>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{address}</span>
            </div>
          )}
          {client.tax_registration_number && (
            <div className="flex items-start gap-3 text-sm">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Tax: {client.tax_registration_number}</span>
            </div>
          )}
          {!client.email && !client.phone && !address && !client.tax_registration_number && (
            <p className="text-sm text-muted-foreground">No contact details on file.</p>
          )}

          {client.preferred_currency && (
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preferred currency</p>
              <p className="mt-1 text-sm">{client.preferred_currency}</p>
            </div>
          )}

          {client.notes && (
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Invoice history */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
              <p className="text-sm font-semibold">Invoice history</p>
              <p className="text-xs text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
            </div>
            {invoices.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No invoices for this client yet.</p>
                <Button size="sm" variant="outline" className="mt-4" asChild>
                  <Link href="/invoices/new">Create first invoice</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Due</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {formatDate(inv.issue_date)}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {inv.due_date ? formatDate(inv.due_date) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(inv.total, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={{
          id:                      client.id,
          name:                    client.name,
          email:                   client.email,
          phone:                   client.phone,
          address_line1:           client.address_line1,
          address_line2:           client.address_line2,
          city:                    client.city,
          state:                   client.state,
          postal_code:             client.postal_code,
          country_code:            client.country_code,
          preferred_currency:      client.preferred_currency,
          tax_registration_number: client.tax_registration_number,
          notes:                   client.notes,
        }}
      />
    </div>
  )
}
