'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, PencilIcon, PlusIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ClientSubunitDialog, type ClientSubunitEditTarget } from './client-subunit-dialog'
import { deleteClientSubunitAction } from '@/app/actions/client-subunits'
import type { ClientSubunit } from '@/types/database'

interface ClientSubunitsSectionProps {
  clientId: string
  subunits: ClientSubunit[]
}

export function ClientSubunitsSection({ clientId, subunits }: ClientSubunitsSectionProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClientSubunitEditTarget | undefined>(undefined)
  const [isPending, startTransition] = useTransition()

  const openCreate = () => { setEditTarget(undefined); setDialogOpen(true) }
  const openEdit   = (s: ClientSubunit) => {
    setEditTarget({
      id: s.id, name: s.name,
      address_line1: s.address_line1, address_line2: s.address_line2,
      city: s.city, state: s.state, postal_code: s.postal_code, country_code: s.country_code,
    })
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteClientSubunitAction(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Sub-unit deleted.'); router.refresh() }
    })
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-units</p>
        <Button variant="ghost" size="sm" onClick={openCreate}>
          <PlusIcon className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>

      {subunits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sub-units yet. Add ship-to or bill-to locations for this client (e.g. warehouses, regional offices).
        </p>
      ) : (
        <div className="space-y-2">
          {subunits.map(s => {
            const addr = [s.address_line1, s.city, s.country_code].filter(Boolean).join(', ')
            return (
              <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    {addr && <p className="truncate text-xs text-muted-foreground">{addr}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                    <PencilIcon className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete sub-unit?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{s.name}". Invoices/proformas already referencing it keep their saved details.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(s.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ClientSubunitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        subunit={editTarget}
      />
    </div>
  )
}
