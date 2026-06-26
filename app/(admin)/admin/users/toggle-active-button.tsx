'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { toggleUserActiveAction } from '@/app/actions/admin'

export function ToggleActiveButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      const r = await toggleUserActiveAction(userId, !isActive)
      if (r.error) { toast.error(r.error); return }
      toast.success(isActive ? 'User suspended.' : 'User enabled.')
    })
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        isActive
          ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
          : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
      }`}
    >
      {isPending ? '…' : isActive ? 'Suspend' : 'Enable'}
    </button>
  )
}
