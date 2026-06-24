'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteClientAction } from '@/app/actions/clients'
import type { Client } from '@/types/database'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Pick<Client, 'id' | 'name'> | null
}

export function DeleteClientDialog({ open, onOpenChange, client }: DeleteClientDialogProps) {
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    if (!client) return
    startTransition(async () => {
      const result = await deleteClientAction(client.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Client deleted.')
      onOpenChange(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete client</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{client?.name}</span>? This action cannot
            be undone. Existing invoices will be retained.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
