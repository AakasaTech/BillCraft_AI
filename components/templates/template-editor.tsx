'use client'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Loader2, PlusIcon, Trash2Icon, Package, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createTemplateAction, updateTemplateAction, type TemplateFormData } from '@/app/actions/templates'
import { CURRENCIES } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const itemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity:    z.number({ invalid_type_error: 'Enter a quantity' }).min(0.0001),
  unit_price:  z.number({ invalid_type_error: 'Enter a price'    }).min(0),
  sort_order:  z.number().default(0),
})

const formSchema = z.object({
  name:                 z.string().min(1, 'Name is required').max(255),
  currency:             z.string().length(3),
  tax_type:             z.enum(['vat', 'gst', 'sales_tax', 'none']).default('none'),
  tax_rate:             z.number().min(0).max(100).default(0),
  discount_amount:      z.number().min(0).default(0),
  due_days:             z.number().int().min(0).max(365).nullable().default(null),
  notes:                z.string().max(2000).optional().or(z.literal('')),
  payment_instructions: z.string().max(2000).optional().or(z.literal('')),
  items:                z.array(itemSchema).min(1),
})

type FormData = z.infer<typeof formSchema>

interface ProductOption { id: string; name: string; description: string | null; unit_price: number; currency: string }

interface TemplateEditorProps {
  templateId?:    string
  defaultCurrency: string
  defaultValues?: Partial<TemplateFormData>
  products?:      ProductOption[]
}

export function TemplateEditor({ templateId, defaultCurrency, defaultValues, products = [] }: TemplateEditorProps) {
  const router = useRouter()
  const isEdit = !!templateId
  const [isPending, startTransition] = useTransition()
  const [catalogOpen,   setCatalogOpen]   = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name:                 defaultValues?.name                 ?? '',
      currency:             defaultValues?.currency             ?? defaultCurrency,
      tax_type:             defaultValues?.tax_type             ?? 'none',
      tax_rate:             defaultValues?.tax_rate             ?? 0,
      discount_amount:      defaultValues?.discount_amount      ?? 0,
      due_days:             defaultValues?.due_days             ?? null,
      notes:                defaultValues?.notes                ?? '',
      payment_instructions: defaultValues?.payment_instructions ?? '',
      items: defaultValues?.items?.length
        ? defaultValues.items
        : [{ description: '', quantity: 1, unit_price: 0, sort_order: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  const watchedItems    = useWatch({ control: form.control, name: 'items' })
  const watchedDiscount = useWatch({ control: form.control, name: 'discount_amount' })
  const watchedTaxRate  = useWatch({ control: form.control, name: 'tax_rate' })
  const watchedTaxType  = useWatch({ control: form.control, name: 'tax_type' })
  const watchedCurrency = useWatch({ control: form.control, name: 'currency' })

  const subtotal    = watchedItems.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0)
  const afterDisc   = Math.max(0, subtotal - (watchedDiscount || 0))
  const taxAmount   = watchedTaxType !== 'none' ? afterDisc * ((watchedTaxRate || 0) / 100) : 0
  const total       = afterDisc + taxAmount

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateTemplateAction(templateId!, data)
        : await createTemplateAction(data)

      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

      {/* Template name */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Template details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Template name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              placeholder="e.g. Monthly Retainer, Web Design Package"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select
              value={form.watch('currency')}
              onValueChange={v => form.setValue('currency', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due_days">Default payment terms (days)</Label>
            <Input
              id="due_days"
              type="number"
              min={0}
              max={365}
              placeholder="e.g. 30 for Net 30"
              value={form.watch('due_days') ?? ''}
              onChange={e => {
                const v = e.target.value
                form.setValue('due_days', v === '' ? null : parseInt(v, 10))
              }}
            />
            <p className="text-xs text-muted-foreground">Leave blank to use the app default.</p>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Line items</h2>

        <div className="hidden sm:grid grid-cols-[1fr_90px_120px_36px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
          <span>Description</span><span>Qty</span><span>Unit price</span><span />
        </div>

        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_120px_36px] items-start">
              <div>
                <Input
                  placeholder="Description"
                  {...form.register(`items.${i}.description`)}
                />
                {form.formState.errors.items?.[i]?.description && (
                  <p className="mt-0.5 text-xs text-destructive">
                    {form.formState.errors.items[i]?.description?.message}
                  </p>
                )}
              </div>
              <Input
                type="number"
                step="0.001"
                min="0"
                placeholder="1"
                {...form.register(`items.${i}.quantity`, { valueAsNumber: true })}
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...form.register(`items.${i}.unit_price`, { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                disabled={fields.length === 1}
                onClick={() => remove(i)}
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: '', quantity: 1, unit_price: 0, sort_order: fields.length })}
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add line item
          </Button>

          {products.length > 0 && (
            <Popover open={catalogOpen} onOpenChange={(v) => { setCatalogOpen(v); if (!v) setCatalogSearch('') }}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Package className="mr-2 h-4 w-4" /> From catalog
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <div className="flex items-center border-b px-3 py-2 gap-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    autoFocus
                    placeholder="Search products…"
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {products
                    .filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          append({
                            description: p.description || p.name,
                            quantity:    1,
                            unit_price:  p.unit_price,
                            sort_order:  fields.length,
                          })
                          setCatalogOpen(false)
                          setCatalogSearch('')
                        }}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatCurrency(p.unit_price, p.currency)}
                        </span>
                      </button>
                    ))}
                  {products.filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">No products match.</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Totals preview */}
        <Separator />
        <div className="ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span><span>{formatCurrency(subtotal, watchedCurrency)}</span>
          </div>
          {(watchedDiscount || 0) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span><span>−{formatCurrency(watchedDiscount || 0, watchedCurrency)}</span>
            </div>
          )}
          {watchedTaxType !== 'none' && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({watchedTaxRate || 0}%)</span>
              <span>{formatCurrency(taxAmount, watchedCurrency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span><span>{formatCurrency(total, watchedCurrency)}</span>
          </div>
        </div>
      </div>

      {/* Tax & discount */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Tax & discount</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Tax type</Label>
            <Select
              value={form.watch('tax_type')}
              onValueChange={v => form.setValue('tax_type', v as FormData['tax_type'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="vat">VAT</SelectItem>
                <SelectItem value="gst">GST</SelectItem>
                <SelectItem value="sales_tax">Sales tax</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {watchedTaxType !== 'none' && (
            <div className="space-y-1.5">
              <Label htmlFor="tax_rate">Tax rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
                {...form.register('tax_rate', { valueAsNumber: true })}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="discount">Discount amount</Label>
            <Input
              id="discount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register('discount_amount', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      {/* Notes & payment instructions */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Notes & instructions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              placeholder="Thank you for your business!"
              {...form.register('notes')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment_instructions">Payment instructions</Label>
            <Textarea
              id="payment_instructions"
              rows={4}
              placeholder="Bank: … / Account: …"
              {...form.register('payment_instructions')}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/templates')} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create template'}
        </Button>
      </div>
    </form>
  )
}
