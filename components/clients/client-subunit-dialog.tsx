'use client'

import { useEffect, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { clientSubunitSchema, type ClientSubunitFormData } from '@/lib/validations/client-subunits'
import { createClientSubunitAction, updateClientSubunitAction } from '@/app/actions/client-subunits'
import { COUNTRIES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { ClientSubunit } from '@/types/database'

export type ClientSubunitEditTarget = Pick<
  ClientSubunit,
  'id' | 'name' | 'address_line1' | 'address_line2' | 'city' | 'state' | 'postal_code' | 'country_code'
>

interface ClientSubunitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  subunit?: ClientSubunitEditTarget
}

const defaultValues: ClientSubunitFormData = {
  name: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country_code: '',
}

export function ClientSubunitDialog({ open, onOpenChange, clientId, subunit }: ClientSubunitDialogProps) {
  const isEdit = !!subunit
  const [isPending, startTransition] = useTransition()

  const form = useForm<ClientSubunitFormData>({
    resolver: zodResolver(clientSubunitSchema),
    defaultValues,
  })

  useEffect(() => {
    if (subunit) {
      form.reset({
        name:          subunit.name,
        address_line1: subunit.address_line1 ?? '',
        address_line2: subunit.address_line2 ?? '',
        city:          subunit.city ?? '',
        state:         subunit.state ?? '',
        postal_code:   subunit.postal_code ?? '',
        country_code:  subunit.country_code ?? '',
      })
    } else {
      form.reset(defaultValues)
    }
  }, [subunit, form])

  const onSubmit = (data: ClientSubunitFormData) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateClientSubunitAction(subunit.id, data)
        : await createClientSubunitAction(clientId, data)

      if (result.error) { toast.error(result.error); return }

      toast.success(isEdit ? 'Sub-unit updated.' : 'Sub-unit created.')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit sub-unit' : 'New sub-unit'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Warehouse 3, Singapore branch"
              aria-invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address_line1">Address</Label>
            <Input id="address_line1" placeholder="123 Main St" {...form.register('address_line1')} />
            <Input placeholder="Suite 400" {...form.register('address_line2')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" {...form.register('state')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postal_code">Postal code</Label>
              <Input id="postal_code" {...form.register('postal_code')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Country</Label>
            <Controller
              control={form.control}
              name="country_code"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add sub-unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
