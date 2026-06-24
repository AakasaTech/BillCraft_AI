'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { acceptInvitationAction } from '@/app/actions/team'

export function AcceptInviteButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition()

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptInvitationAction(token)
      if (result?.error) toast.error(result.error)
      // On success, acceptInvitationAction redirects to /dashboard
    })
  }

  return (
    <Button className="w-full" size="lg" onClick={handleAccept} disabled={isPending}>
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Accept invitation
    </Button>
  )
}
