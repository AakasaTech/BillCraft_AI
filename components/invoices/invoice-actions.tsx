'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Pencil, Trash2, Send, XCircle,
  Download, Mail, Bell, Link2, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { updateInvoiceStatusAction, deleteInvoiceAction } from '@/app/actions/invoices'
import { sendInvoiceEmailAction } from '@/app/actions/send-invoice'
import { AiReminderDialog } from './ai-reminder-dialog'
import { RecordPaymentDialog } from './record-payment-dialog'

interface InvoiceActionsProps {
  invoiceId:   string
  status:      string
  clientEmail: string | null
  amountDue:   number
  currency:    string
  shareToken?: string | null
  canUseAI?:   boolean
}

export function InvoiceActions({ invoiceId, status, clientEmail, amountDue, currency, shareToken, canUseAI = false }: InvoiceActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCopied,       setIsCopied]       = useState(false)
  const [reminderOpen,   setReminderOpen]   = useState(false)

  const handleStatus = (newStatus: string) => {
    startTransition(async () => {
      const result = await updateInvoiceStatusAction(invoiceId, newStatus)
      if (result?.error) toast.error(result.error)
      else toast.success(`Invoice marked as ${newStatus}.`)
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

  const canShare  = !!shareToken && !['draft', 'cancelled', 'void'].includes(status)
  const canEdit   = status === 'draft'
  const canSend     = status === 'draft' || status === 'viewed'
  const canEmail    = ['draft', 'sent', 'viewed', 'overdue', 'partial'].includes(status)
  const canRemind   = ['sent', 'viewed', 'partial', 'overdue'].includes(status)
  const canPay      = ['draft', 'sent', 'viewed', 'partial', 'overdue'].includes(status)
  const canVoid     = ['sent', 'viewed', 'partial', 'overdue'].includes(status)
  const canDelete   = status === 'draft' || status === 'cancelled'

  return (
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
  )
}
