'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface EstimateRespondFormProps {
  token: string
}

export function EstimateRespondForm({ token }: EstimateRespondFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode,  setMode]  = useState<'idle' | 'declining'>('idle')
  const [note,  setNote]  = useState('')
  const [error, setError] = useState('')

  const respond = (action: 'accept' | 'decline') => {
    startTransition(async () => {
      setError('')
      const res = await fetch(`/api/e/${token}/respond`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, note: action === 'decline' ? note : undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Something went wrong. Please try again.')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {mode === 'idle' && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond('accept')}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Accept estimate
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setMode('declining')}
            className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Decline
          </button>
        </div>
      )}

      {mode === 'declining' && (
        <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium">Let us know why (optional)</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="Price too high, timeline doesn't work, etc."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => respond('decline')}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm decline
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => { setMode('idle'); setNote('') }}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
