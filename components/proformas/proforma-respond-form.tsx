'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface ProformaRespondFormProps {
  token: string
}

// Accept-only — unlike EstimateRespondForm, there is no "decline" here.
// proformas.status has no declined value (draft/sent/viewed/accepted/converted/expired).
export function ProformaRespondForm({ token }: ProformaRespondFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const accept = () => {
    startTransition(async () => {
      const res = await fetch(`/api/pr/${token}/respond`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'accept' }),
      })
      if (!res.ok) return
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={accept}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Accept proforma
      </button>
    </div>
  )
}
