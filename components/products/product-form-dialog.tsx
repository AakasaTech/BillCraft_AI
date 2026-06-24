'use client'

import { useEffect, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CURRENCIES } from '@/lib/constants'
import { createProductAction, updateProductAction, type ProductFormData } from '@/app/actions/products'
import type { Product } from '@/types/database'

const schema = z.object({
  name:        z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  unit_price:  z.number().min(0, 'Price must be 0 or more'),
  currency:    z.string().length(3),
  is_active:   z.boolean().default(true),
})

interface ProductFormDialogProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  defaultCurrency: string
  product?:      Product | null
}

export function ProductFormDialog({ open, onOpenChange, defaultCurrency, product }: ProductFormDialogProps) {
  const isEdit = !!product
  const [isPending, startTransition] = useTransition()

  const form = useForm<ProductFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        product?.name        ?? '',
      description: product?.description ?? '',
      unit_price:  product?.unit_price  ?? 0,
      currency:    product?.currency    ?? defaultCurrency,
      is_active:   product?.is_active   ?? true,
    },
  })

  useEffect(() => {
    form.reset({
      name:        product?.name        ?? '',
      description: product?.description ?? '',
      unit_price:  product?.unit_price  ?? 0,
      currency:    product?.currency    ?? defaultCurrency,
      is_active:   product?.is_active   ?? true,
    })
  }, [product, defaultCurrency, form])

  const onSubmit = (data: ProductFormData) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateProductAction(product!.id, data)
        : await createProductAction(data)

      if (result.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Product updated.' : 'Product created.')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Web Design, Consulting Hour"
              autoFocus
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional — used as the line item description in invoices"
              rows={2}
              className="resize-none"
              {...form.register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unit_price">Unit price *</Label>
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('unit_price', { valueAsNumber: true })}
              />
              {form.formState.errors.unit_price && (
                <p className="text-xs text-destructive">{form.formState.errors.unit_price.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Currency *</Label>
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Switch
                  id="is_active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="is_active" className="cursor-pointer font-normal">
              Active (visible in invoice catalog)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
