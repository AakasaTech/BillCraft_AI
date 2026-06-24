'use client'

import { useEffect, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { clientSchema, type ClientFormData } from '@/lib/validations/clients'
import { createClientAction, updateClientAction } from '@/app/actions/clients'
import { COUNTRIES, CURRENCIES } from '@/lib/constants'
import type { Client } from '@/types/database'

export type ClientEditTarget = Pick<
  Client,
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'address_line1'
  | 'address_line2'
  | 'city'
  | 'state'
  | 'postal_code'
  | 'country_code'
  | 'preferred_currency'
  | 'tax_registration_number'
  | 'notes'
>

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: ClientEditTarget
}

const defaultValues: ClientFormData = {
  name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country_code: '',
  preferred_currency: '',
  tax_registration_number: '',
  notes: '',
}

export function ClientFormDialog({ open, onOpenChange, client }: ClientFormDialogProps) {
  const isEdit = !!client
  const [isPending, startTransition] = useTransition()

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues,
  })

  // Sync form when client changes (switching between edit targets)
  useEffect(() => {
    if (client) {
      form.reset({
        name:                    client.name,
        email:                   client.email ?? '',
        phone:                   client.phone ?? '',
        address_line1:           client.address_line1 ?? '',
        address_line2:           client.address_line2 ?? '',
        city:                    client.city ?? '',
        state:                   client.state ?? '',
        postal_code:             client.postal_code ?? '',
        country_code:            client.country_code ?? '',
        preferred_currency:      client.preferred_currency ?? '',
        tax_registration_number: client.tax_registration_number ?? '',
        notes:                   client.notes ?? '',
      })
    } else {
      form.reset(defaultValues)
    }
  }, [client, form])

  const onSubmit = (data: ClientFormData) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateClientAction(client.id, data)
        : await createClientAction(data)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? 'Client updated.' : 'Client created.')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit client' : 'New client'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Name + Email */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Acme Corp"
                aria-invalid={!!form.formState.errors.name}
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="billing@acme.com"
                aria-invalid={!!form.formState.errors.email}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Phone + Country */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 000 0000"
                {...form.register('phone')}
              />
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
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address_line1">Address</Label>
            <Input
              id="address_line1"
              placeholder="123 Main St"
              {...form.register('address_line1')}
            />
            <Input
              placeholder="Suite 400"
              {...form.register('address_line2')}
            />
          </div>

          {/* City + State + Postal */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="New York" {...form.register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" placeholder="NY" {...form.register('state')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postal_code">Postal code</Label>
              <Input id="postal_code" placeholder="10001" {...form.register('postal_code')} />
            </div>
          </div>

          {/* Currency + Tax ID */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Preferred currency</Label>
              <Controller
                control={form.control}
                name="preferred_currency"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Same as org default" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax_registration_number">Tax / VAT number</Label>
              <Input
                id="tax_registration_number"
                placeholder="GB123456789"
                {...form.register('tax_registration_number')}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Internal notes about this client…"
              rows={3}
              {...form.register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
