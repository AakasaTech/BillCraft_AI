'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2, RefreshCw, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendReminderAction } from '@/app/actions/send-reminder'
import { DEFAULT_BODIES } from '@/lib/email/template-renderer'

interface Props {
  open:        boolean
  onOpenChange: (open: boolean) => void
  invoiceId:   string
  clientEmail: string
  canUseAI:    boolean
  onSuccess?:  () => void
}

export function AiReminderDialog({
  open, onOpenChange, invoiceId, clientEmail, canUseAI, onSuccess,
}: Props) {
  const [draft,      setDraft]      = useState('')
  const [isDrafting, setIsDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [isSending,  startSending]  = useTransition()

  async function fetchDraft() {
    if (!canUseAI) {
      setDraft(DEFAULT_BODIES.reminder ?? '')
      return
    }
    setIsDrafting(true)
    setDraftError(null)
    try {
      const res  = await fetch('/api/ai/draft-reminder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ invoice_id: invoiceId }),
      })
      const data = await res.json() as { body?: string; error?: string }
      if (!res.ok || data.error) {
        setDraftError(data.error ?? 'Failed to draft reminder.')
        setDraft(DEFAULT_BODIES.reminder ?? '')
      } else {
        setDraft(data.body ?? DEFAULT_BODIES.reminder ?? '')
      }
    } catch {
      setDraftError('Network error. You can still edit and send the default message.')
      setDraft(DEFAULT_BODIES.reminder ?? '')
    } finally {
      setIsDrafting(false)
    }
  }

  // Fetch draft when dialog opens
  useEffect(() => {
    if (open) {
      setDraft('')
      setDraftError(null)
      fetchDraft()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSend() {
    startSending(async () => {
      const result = await sendReminderAction(invoiceId, draft.trim() || undefined)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Payment reminder sent to client.')
        onOpenChange(false)
        onSuccess?.()
      }
    })
  }

  const isLoading = isDrafting || isSending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {canUseAI && <Sparkles className="h-4 w-4 text-primary" />}
            Send payment reminder
          </DialogTitle>
          <DialogDescription>
            {canUseAI
              ? 'AI has drafted a personalised reminder message. Review and edit before sending.'
              : 'Review and customise the reminder message before sending.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminder-body">Message body</Label>
            {canUseAI && (
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDraft}
                disabled={isLoading}
                className="h-7 gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${isDrafting ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            )}
          </div>

          {isDrafting ? (
            <div className="flex h-32 items-center justify-center gap-2 rounded-md border bg-muted/30 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Drafting with AI…
            </div>
          ) : (
            <Textarea
              id="reminder-body"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={5}
              className="resize-none text-sm"
              placeholder="Enter the reminder message body…"
              disabled={isSending}
            />
          )}

          {draftError && (
            <p className="text-xs text-amber-600">{draftError}</p>
          )}

          {!canUseAI && (
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Upgrade to Pro</span> to get AI-personalised reminder drafts automatically.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Sending to <strong>{clientEmail}</strong>. The invoice PDF will be attached automatically.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isLoading || isDrafting}>
            {isSending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
              : <><Send className="mr-2 h-4 w-4" /> Send reminder</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
