'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Pencil, Trash2, Send, XCircle,
  Download, Mail, Bell, Link2, Check, ClipboardCheck, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  updateInvoiceStatusAction, deleteInvoiceAction,
  submitForApprovalAction, approveInvoiceAction, rejectInvoiceAction,
} from '@/app/actions/invoices'
import { sendInvoiceEmailAction } from '@/app/actions/send-invoice'
import { AiReminderDialog } from './ai-reminder-dialog'
import { RecordPaymentDialog } from './record-payment-dialog'

interface InvoiceActionsProps {
  invoiceId:        string
  status:           string
  clientEmail:      string | null
  amountDue:        number
  currency:         string
  shareToken?:      string | null
  canUseAI?:        boolean
  approvalRequired?: boolean
  canApprove?:       boolean
  isCreator?:        boolean
  isSoleApprover?:   boolean
  rejectionNote?:    string | null
}

export function InvoiceActions({
  invoiceId, status, clientEmail, amountDue, currency, shareToken, canUseAI = false,
  approvalRequired = false, canApprove = false, isCreator = false, isSoleApprover = false, rejectionNote,
}: InvoiceActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCopied,       setIsCopied]       = useState(false)
  const [reminderOpen,   setReminderOpen]   = useState(false)
  const [rejecting,      setRejecting]      = useState(false)
  const [rejectNote,     setRejectNote]     = useState('')

  const handleStatus = (newStatus: string) => {
    startTransition(async () => {
      const result = await updateInvoiceStatusAction(invoiceId, newStatus)
      if (result?.error) toast.error(result.error)
      else toast.success(`Invoice marked as ${newStatus}.`)
    })
  }

  const handleSubmitForApproval = () => {
    startTransition(async () => {
      const result = await submitForApprovalAction(invoiceId)
      if (result?.error) toast.error(result.error)
      else { toast.success('Submitted for approval.'); router.refresh() }
    })
  }

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveInvoiceAction(invoiceId)
      if (result?.error) toast.error(result.error)
      else { toast.success('Invoice approved.'); router.refresh() }
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectInvoiceAction(invoiceId, rejectNote)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Invoice rejected.')
      setRejecting(false)
      setRejectNote('')
      router.refresh()
    })
  }

  const handleSendEmail = () => {
    startTransition(async () => {
      const result = await sendInvoiceEmailAction(invoiceId)
      if (result?.error) toast.error(result.error)
      else toast.success('Invoice sent to client.')
    })
  }

  const handleCopyLink = async () => {
    if (!shareToken) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${shareToken}`)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error('Could not copy link.')
    }
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteInvoiceAction(invoiceId)
    })
  }

  const isDraft         = status === 'draft'
  // Sole-approver orgs don't need a separate reviewer: drafts are sendable
  // directly (the send auto-approves), so "Submit for approval" is hidden.
  const draftSendable   = isDraft && (!approvalRequired || isSoleApprover)
  const canSubmit       = isDraft && approvalRequired && !isSoleApprover
  const canActOnApproval = status === 'pending_approval' && canApprove && !isCreator
  const awaitingOthersApproval = status === 'pending_approval' && !canActOnApproval

  const canShare  = !!shareToken && !['draft', 'pending_approval', 'cancelled', 'void'].includes(status)
  const canEdit   = isDraft
  const canSend     = draftSendable || status === 'viewed'
  const canEmail    = draftSendable || ['sent', 'viewed', 'overdue', 'partial'].includes(status)
  const canRemind   = ['sent', 'viewed', 'partial', 'overdue'].includes(status)
  const canPay      = ['draft', 'sent', 'viewed', 'partial', 'overdue'].includes(status)
  const canVoid     = ['sent', 'viewed', 'partial', 'overdue'].includes(status)
  const canDelete   = isDraft || status === 'cancelled'

  return (
    <div className="flex flex-col items-end gap-2">
      {isDraft && rejectionNote && (
        <div className="w-full rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span className="font-medium">Rejected: </span>{rejectionNote}
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

    <div className="flex flex-wrap items-center gap-2">
      {/* Download PDF — always available */}
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noopener noreferrer">
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </a>
      </Button>

      {/* Copy public link */}
      {canShare && (
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          {isCopied
            ? <><Check className="mr-2 h-4 w-4 text-green-600" /> Copied!</>
            : <><Link2 className="mr-2 h-4 w-4" /> Copy link</>}
        </Button>
      )}

      {/* Send to client email */}
      {canEmail && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              {isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Mail className="mr-2 h-4 w-4" />}
              Send to client
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send invoice to client?</AlertDialogTitle>
              <AlertDialogDescription>
                {clientEmail
                  ? `The invoice PDF will be emailed to ${clientEmail}. The invoice status will be updated to "Sent".`
                  : 'This client has no email address. Add one on the client page before sending.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {clientEmail && (
                <AlertDialogAction onClick={handleSendEmail}>
                  Send email
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Send payment reminder */}
      {canRemind && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              if (!clientEmail) {
                toast.error('This client has no email address. Add one on the client page before sending.')
                return
              }
              setReminderOpen(true)
            }}
          >
            <Bell className="mr-2 h-4 w-4" />
            Send reminder
          </Button>
          {clientEmail && (
            <AiReminderDialog
              open={reminderOpen}
              onOpenChange={setReminderOpen}
              invoiceId={invoiceId}
              clientEmail={clientEmail}
              canUseAI={canUseAI}
            />
          )}
        </>
      )}

      {canEdit && (
        <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/${invoiceId}/edit`)} disabled={isPending}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
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

      {canSend && (
        <Button variant="outline" size="sm" onClick={() => handleStatus('sent')} disabled={isPending}>
          {isPending
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Send className="mr-2 h-4 w-4" />}
          Mark as sent
        </Button>
      )}

      {canPay && (
        <RecordPaymentDialog
          invoiceId={invoiceId}
          amountDue={amountDue}
          currency={currency}
          disabled={isPending}
        />
      )}

      {canVoid && (
        <Button variant="outline" size="sm" onClick={() => handleStatus('void')} disabled={isPending}>
          <XCircle className="mr-2 h-4 w-4" /> Void
        </Button>
      )}

      {canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isPending}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This invoice will be permanently deleted. This cannot be undone.
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
      )}
    </div>
    </div>
  )
}
