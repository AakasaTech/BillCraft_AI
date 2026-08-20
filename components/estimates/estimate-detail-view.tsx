'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Pencil, Send, FileCheck2, FileX2, Clock, Trash2, ArrowRight, ExternalLink,
  Loader2, ClipboardCheck, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import { EstimateStatusBadge } from '@/components/estimates/estimate-status-badge'
import {
  sendEstimateEmailAction, markEstimateStatusAction,
  deleteEstimateAction, convertEstimateAction,
  submitEstimateForApprovalAction, approveEstimateAction, rejectEstimateAction,
} from '@/app/actions/estimates'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { Estimate, EstimateItem, Client, ClientSubunit, Organization, EstimateStatus } from '@/types/database'

interface EstimateDetailViewProps {
  estimate:        Estimate
  items:           EstimateItem[]
  client:          Client
  clientSubunit:   ClientSubunit | null
  org:             Organization
  approvalRequired?: boolean
  canApprove?:       boolean
  isCreator?:        boolean
  isSoleApprover?:   boolean
}

export function EstimateDetailView({
  estimate, items, client, clientSubunit, org,
  approvalRequired = false, canApprove = false, isCreator = false, isSoleApprover = false,
}: EstimateDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const status = estimate.status as EstimateStatus

  const handleSend = () => startTransition(async () => {
    const r = await sendEstimateEmailAction(estimate.id)
    if (r?.error) toast.error(r.error)
    else { toast.success('Estimate sent!'); router.refresh() }
  })

  const handleMark = (s: 'accepted' | 'declined' | 'expired') => startTransition(async () => {
    const r = await markEstimateStatusAction(estimate.id, s)
    if (r?.error) toast.error(r.error)
    else { toast.success(`Marked as ${s}.`); router.refresh() }
  })

  const handleDelete = () => startTransition(async () => {
    const r = await deleteEstimateAction(estimate.id)
    if (r?.error) toast.error(r.error)
    else { toast.success('Estimate deleted.'); router.push('/estimates') }
  })

  const handleConvert = () => startTransition(async () => {
    const r = await convertEstimateAction(estimate.id)
    if (r?.error) { toast.error(r.error); return }
    if (r.proformaId) {
      toast.success('Proforma created!')
      router.push(`/proformas/${r.proformaId}`)
    } else if (r.invoiceId) {
      toast.success('Invoice created!')
      router.push(`/invoices/${r.invoiceId}/edit`)
    }
  })

  const handleSubmitForApproval = () => startTransition(async () => {
    const r = await submitEstimateForApprovalAction(estimate.id)
    if (r?.error) toast.error(r.error)
    else { toast.success('Submitted for approval.'); router.refresh() }
  })

  const handleApprove = () => startTransition(async () => {
    const r = await approveEstimateAction(estimate.id)
    if (r?.error) toast.error(r.error)
    else { toast.success('Estimate approved.'); router.refresh() }
  })

  const handleReject = () => startTransition(async () => {
    const r = await rejectEstimateAction(estimate.id, rejectNote)
    if (r?.error) { toast.error(r.error); return }
    toast.success('Estimate rejected.')
    setRejecting(false)
    setRejectNote('')
    router.refresh()
  })

  const isDraft              = status === 'draft'
  // Sole-approver orgs don't need a separate reviewer: drafts are sendable
  // directly (the send auto-approves), so "Submit for approval" is hidden.
  const draftSendable        = isDraft && (!approvalRequired || isSoleApprover)
  const canSubmit            = isDraft && approvalRequired && !isSoleApprover
  const canActOnApproval     = status === 'pending_approval' && canApprove && !isCreator
  const awaitingOthersApproval = status === 'pending_approval' && !canActOnApproval
  const canEdit   = isDraft
  const canSend   = draftSendable || status === 'viewed'
  const canShare  = !!estimate.share_token && !['draft', 'pending_approval'].includes(status)

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{estimate.estimate_number}</h1>
            <EstimateStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {client.name} · {formatDate(estimate.issue_date)}
            {estimate.expiry_date && ` · Valid until ${formatDate(estimate.expiry_date)}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {estimate.share_token && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/e/${estimate.share_token}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Public view
              </a>
            </Button>
          )}

          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/estimates/${estimate.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link>
            </Button>
          )}

          {canSend && (
            <Button variant="outline" size="sm" disabled={isPending} onClick={handleSend}>
              <Send className="mr-2 h-4 w-4" /> {status === 'draft' ? 'Send' : 'Resend'}
            </Button>
          )}

          {canSubmit && (
            <Button size="sm" onClick={handleSubmitForApproval} disabled={isPending}>
              {isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <ClipboardCheck className="mr-2 h-4 w-4" />}
              Submit for approval
            </Button>
          )}

          {awaitingOthersApproval && (
            <span className="inline-flex items-center rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
              {isCreator ? 'Awaiting approval from another approver' : 'Awaiting approval'}
            </span>
          )}

          {canActOnApproval && !rejecting && (
            <>
              <Button size="sm" onClick={handleApprove} disabled={isPending}>
                {isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <ThumbsUp className="mr-2 h-4 w-4" />}
                Approve
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRejecting(true)} disabled={isPending}>
                <ThumbsDown className="mr-2 h-4 w-4" /> Reject
              </Button>
            </>
          )}

          {status === 'accepted' && !estimate.converted_invoice_id && !estimate.converted_proforma_id && (
            <Button size="sm" disabled={isPending} onClick={handleConvert}>
              <ArrowRight className="mr-2 h-4 w-4" />
              {org.category === 'trading' ? 'Convert to proforma' : 'Convert to invoice'}
            </Button>
          )}

          {estimate.converted_invoice_id && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/invoices/${estimate.converted_invoice_id}`}>
                <FileCheck2 className="mr-2 h-4 w-4" /> View invoice
              </Link>
            </Button>
          )}

          {estimate.converted_proforma_id && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/proformas/${estimate.converted_proforma_id}`}>
                <FileCheck2 className="mr-2 h-4 w-4" /> View proforma
              </Link>
            </Button>
          )}

          {(status === 'sent' || status === 'viewed') && (
            <>
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleMark('accepted')}>
                <FileCheck2 className="mr-2 h-4 w-4" /> Mark accepted
              </Button>
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleMark('declined')}>
                <FileX2 className="mr-2 h-4 w-4" /> Mark declined
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
                <AlertDialogTitle>Delete estimate?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {estimate.estimate_number}. This action cannot be undone.
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

      {isDraft && estimate.rejection_note && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span className="font-medium">Rejected: </span>{estimate.rejection_note}
        </div>
      )}

      {rejecting && (
        <div className="w-full space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <Textarea
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            placeholder="Explain what needs to change before this can be approved…"
            rows={2}
            className="resize-none bg-background"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setRejecting(false); setRejectNote('') }} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive" size="sm"
              onClick={handleReject}
              disabled={isPending || !rejectNote.trim()}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm rejection
            </Button>
          </div>
        </div>
      )}

      {/* Response info */}
      {estimate.responded_at && (
        <div className={`rounded-xl border p-4 text-sm ${
          status === 'accepted' ? 'border-green-200 bg-green-50 text-green-700'
          : status === 'declined' ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-muted bg-muted/30 text-muted-foreground'
        }`}>
          Client responded {formatDate(estimate.responded_at)}.
          {estimate.response_note && ` Note: "${estimate.response_note}"`}
        </div>
      )}

      {/* Main card */}
      <div className="rounded-2xl border bg-card p-8 space-y-8 shadow-sm">

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Prepared for</p>
            <p className="font-semibold">{client.name}</p>
            {clientSubunit?.name && <p className="text-sm text-muted-foreground">Attn: {clientSubunit.name}</p>}
            {client.email        && <p className="text-sm text-muted-foreground">{client.email}</p>}
            {(clientSubunit?.address_line1 ?? client.address_line1) && (
              <p className="text-sm text-muted-foreground">{clientSubunit?.address_line1 ?? client.address_line1}</p>
            )}
            {((clientSubunit?.city ?? client.city) || (clientSubunit?.country_code ?? client.country_code)) && (
              <p className="text-sm text-muted-foreground">
                {[clientSubunit?.city ?? client.city, clientSubunit?.country_code ?? client.country_code].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="space-y-1.5 text-sm sm:text-right">
            <div><span className="text-muted-foreground">Estimate #: </span><span className="font-medium">{estimate.estimate_number}</span></div>
            <div><span className="text-muted-foreground">Issued: </span><span>{formatDate(estimate.issue_date)}</span></div>
            {estimate.expiry_date && (
              <div><span className="text-muted-foreground">Valid until: </span><span className="font-medium">{formatDate(estimate.expiry_date)}</span></div>
            )}
            <div><span className="text-muted-foreground">Currency: </span><span>{estimate.currency}</span></div>
            {org.name && <div><span className="text-muted-foreground">From: </span><span>{org.name}</span></div>}
          </div>
        </div>

        <Separator />

        <div>
          <div className="hidden sm:grid grid-cols-[1fr_80px_120px_100px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">
            <span>Description</span><span>Qty</span><span>Unit price</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="divide-y">
            {items.map(item => (
              <div key={item.id} className="py-3 grid grid-cols-1 gap-1 sm:grid-cols-[1fr_80px_120px_100px] sm:gap-2 sm:items-center">
                <p className="font-medium">{item.description}</p>
                <p className="text-sm text-muted-foreground sm:text-foreground">
                  <span className="sm:hidden text-muted-foreground">Qty: </span>{item.quantity}
                </p>
                <p className="text-sm text-muted-foreground sm:text-foreground">
                  <span className="sm:hidden text-muted-foreground">Unit: </span>
                  {formatCurrency(item.unit_price, estimate.currency)}
                </p>
                <p className="font-semibold sm:text-right">{formatCurrency(item.total, estimate.currency)}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(estimate.subtotal, estimate.currency)}</span>
          </div>
          {estimate.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>−{formatCurrency(estimate.discount_amount, estimate.currency)}</span>
            </div>
          )}
          {estimate.tax_amount > 0 && !estimate.is_simplified && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({estimate.tax_rate}%)</span>
              <span>{formatCurrency(estimate.tax_amount, estimate.currency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-amber-600">{formatCurrency(estimate.total, estimate.currency)}</span>
          </div>
          {estimate.is_simplified && (
            <p className="text-right text-xs text-muted-foreground">All amounts include applicable tax</p>
          )}
        </div>

        {(estimate.notes || estimate.terms) && (
          <>
            <Separator />
            <div className="grid gap-6 sm:grid-cols-2">
              {estimate.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{estimate.notes}</p>
                </div>
              )}
              {estimate.terms && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Terms &amp; conditions</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{estimate.terms}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {canShare && (
        <div className="flex justify-end">
          <a
            href={`/api/e/${estimate.share_token}/pdf`}
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
