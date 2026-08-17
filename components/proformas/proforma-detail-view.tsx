'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Pencil, Send, FileCheck2, Clock, Trash2, ArrowRight, ExternalLink } from 'lucide-react'
import { ProformaStatusBadge } from '@/components/proformas/proforma-status-badge'
import {
  sendProformaEmailAction, markProformaStatusAction,
  deleteProformaAction, convertProformaToInvoiceAction,
} from '@/app/actions/proformas'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { Proforma, ProformaItem, Client, ClientSubunit, Organization, ProformaStatus } from '@/types/database'

interface ProformaDetailViewProps {
  proforma:      Proforma
  items:         ProformaItem[]
  client:        Client
  clientSubunit: ClientSubunit | null
  org:           Organization
}

export function ProformaDetailView({ proforma, items, client, clientSubunit, org }: ProformaDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const status = proforma.status as ProformaStatus

  const handleSend = () => startTransition(async () => {
    const r = await sendProformaEmailAction(proforma.id)
    if (r?.error) toast.error(r.error)
    else { toast.success('Proforma sent!'); router.refresh() }
  })

  const handleMark = (s: 'accepted' | 'expired') => startTransition(async () => {
    const r = await markProformaStatusAction(proforma.id, s)
    if (r?.error) toast.error(r.error)
    else { toast.success(`Marked as ${s}.`); router.refresh() }
  })

  const handleDelete = () => startTransition(async () => {
    const r = await deleteProformaAction(proforma.id)
    if (r?.error) toast.error(r.error)
    else { toast.success('Proforma deleted.'); router.push('/proformas') }
  })

  const handleConvert = () => startTransition(async () => {
    const r = await convertProformaToInvoiceAction(proforma.id)
    if (r?.error) toast.error(r.error)
    else { toast.success('Invoice created!'); router.push(`/invoices/${r.invoiceId}/edit`) }
  })

  const billToAddr1   = clientSubunit?.address_line1 ?? client.address_line1
  const billToCity    = clientSubunit?.city           ?? client.city
  const billToCountry = clientSubunit?.country_code   ?? client.country_code

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{proforma.proforma_number}</h1>
            <ProformaStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {client.name} · {formatDate(proforma.issue_date)}
            {proforma.expiry_date && ` · Valid until ${formatDate(proforma.expiry_date)}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {proforma.share_token && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/pr/${proforma.share_token}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Public view
              </a>
            </Button>
          )}

          {status === 'draft' && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/proformas/${proforma.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link>
            </Button>
          )}

          {(status === 'draft' || status === 'sent' || status === 'viewed') && (
            <Button variant="outline" size="sm" disabled={isPending} onClick={handleSend}>
              <Send className="mr-2 h-4 w-4" /> {status === 'draft' ? 'Send' : 'Resend'}
            </Button>
          )}

          {status === 'accepted' && !proforma.converted_invoice_id && (
            <Button size="sm" disabled={isPending} onClick={handleConvert}>
              <ArrowRight className="mr-2 h-4 w-4" /> Convert to invoice
            </Button>
          )}

          {proforma.converted_invoice_id && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/invoices/${proforma.converted_invoice_id}`}>
                <FileCheck2 className="mr-2 h-4 w-4" /> View invoice
              </Link>
            </Button>
          )}

          {(status === 'sent' || status === 'viewed') && (
            <>
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleMark('accepted')}>
                <FileCheck2 className="mr-2 h-4 w-4" /> Mark accepted
              </Button>
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleMark('expired')}>
                <Clock className="mr-2 h-4 w-4" /> Mark expired
              </Button>
            </>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" disabled={isPending}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete proforma?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {proforma.proforma_number}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Response info */}
      {proforma.responded_at && (
        <div className={`rounded-xl border p-4 text-sm ${
          status === 'accepted' || status === 'converted' ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-muted bg-muted/30 text-muted-foreground'
        }`}>
          Client responded {formatDate(proforma.responded_at)}.
        </div>
      )}

      {/* Main card */}
      <div className="rounded-2xl border bg-card p-8 space-y-8 shadow-sm">

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Bill to</p>
            <p className="font-semibold">{client.name}</p>
            {clientSubunit?.name && <p className="text-sm text-muted-foreground">Attn: {clientSubunit.name}</p>}
            {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
            {billToAddr1 && <p className="text-sm text-muted-foreground">{billToAddr1}</p>}
            {(billToCity || billToCountry) && (
              <p className="text-sm text-muted-foreground">
                {[billToCity, billToCountry].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="space-y-1.5 text-sm sm:text-right">
            <div><span className="text-muted-foreground">Proforma #: </span><span className="font-medium">{proforma.proforma_number}</span></div>
            <div><span className="text-muted-foreground">Issued: </span><span>{formatDate(proforma.issue_date)}</span></div>
            {proforma.expiry_date && (
              <div><span className="text-muted-foreground">Valid until: </span><span className="font-medium">{formatDate(proforma.expiry_date)}</span></div>
            )}
            <div><span className="text-muted-foreground">Currency: </span><span>{proforma.currency}</span></div>
            {proforma.shipping_terms && (
              <div><span className="text-muted-foreground">Shipping terms: </span><span>{proforma.shipping_terms}</span></div>
            )}
            {org.name && <div><span className="text-muted-foreground">From: </span><span>{org.name}</span></div>}
          </div>
        </div>

        <Separator />

        <div>
          <div className="hidden sm:grid grid-cols-[1fr_80px_100px_80px_80px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">
            <span>Description</span><span>Qty</span><span>Unit price</span><span>HS code</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="divide-y">
            {items.map(item => (
              <div key={item.id} className="py-3 grid grid-cols-1 gap-1 sm:grid-cols-[1fr_80px_100px_80px_80px] sm:gap-2 sm:items-center">
                <p className="font-medium">{item.description}</p>
                <p className="text-sm text-muted-foreground sm:text-foreground">
                  <span className="sm:hidden text-muted-foreground">Qty: </span>{item.quantity}
                </p>
                <p className="text-sm text-muted-foreground sm:text-foreground">
                  <span className="sm:hidden text-muted-foreground">Unit: </span>
                  {formatCurrency(item.unit_price, proforma.currency)}
                </p>
                <p className="text-sm text-muted-foreground sm:text-foreground">
                  <span className="sm:hidden text-muted-foreground">HS: </span>{item.hs_code ?? '—'}
                </p>
                <p className="font-semibold sm:text-right">{formatCurrency(item.total, proforma.currency)}</p>
              </div>
            ))}
            {proforma.local_transport_amount > 0 && (
              <div className="py-3 grid grid-cols-1 gap-1 sm:grid-cols-[1fr_80px_100px_80px_80px] sm:gap-2 sm:items-center">
                <p className="font-medium">Local Transport</p>
                <p className="text-sm text-muted-foreground sm:text-foreground">
                  <span className="sm:hidden text-muted-foreground">Qty: </span>1
                </p>
                <p className="text-sm text-muted-foreground sm:text-foreground">
                  <span className="sm:hidden text-muted-foreground">Unit: </span>
                  {formatCurrency(proforma.local_transport_amount, proforma.currency)}
                </p>
                <p className="text-sm text-muted-foreground sm:text-foreground">—</p>
                <p className="font-semibold sm:text-right">{formatCurrency(proforma.local_transport_amount, proforma.currency)}</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(proforma.subtotal, proforma.currency)}</span>
          </div>
          {proforma.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>−{formatCurrency(proforma.discount_amount, proforma.currency)}</span>
            </div>
          )}
          {proforma.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({proforma.tax_rate}%)</span>
              <span>{formatCurrency(proforma.tax_amount, proforma.currency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-teal-600">{formatCurrency(proforma.total, proforma.currency)}</span>
          </div>
        </div>

        {(proforma.notes || proforma.terms) && (
          <>
            <Separator />
            <div className="grid gap-6 sm:grid-cols-2">
              {proforma.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{proforma.notes}</p>
                </div>
              )}
              {proforma.terms && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Terms &amp; conditions</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{proforma.terms}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {proforma.share_token && (
        <div className="flex justify-end">
          <a
            href={`/api/pr/${proforma.share_token}/pdf`}
            download
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Download PDF
          </a>
        </div>
      )}
    </div>
  )
}
