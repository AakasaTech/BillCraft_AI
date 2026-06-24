'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PauseCircle, PlayCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleRecurringAction, deleteRecurringAction } from '@/app/actions/recurring'

interface RecurringActionsProps {
  id:       string
  isActive: boolean
}

export function RecurringActions({ id, isActive }: RecurringActionsProps) {
  const router  = useRouter()
  const [busy, setBusy] = useState<'toggle' | 'delete' | null>(null)

  async function handleToggle() {
    setBusy('toggle')
    await toggleRecurringAction(id, !isActive)
    setBusy(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this recurring schedule? This cannot be undone.')) return
    setBusy('delete')
    await deleteRecurringAction(id)
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button
        variant="outline" size="sm"
        onClick={handleToggle}
        disabled={busy !== null}
      >
        {isActive
          ? <><PauseCircle className="mr-2 h-4 w-4" /> Pause</>
          : <><PlayCircle  className="mr-2 h-4 w-4" /> Activate</>}
      </Button>
      <Button
        variant="outline" size="sm"
        className="text-destructive hover:bg-destructive/10"
        onClick={handleDelete}
        disabled={busy !== null}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
