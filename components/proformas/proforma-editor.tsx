'use client'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Loader2, PlusIcon, Trash2Icon, Package, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createProformaAction, updateProformaAction } from '@/app/actions/proformas'
import { proformaFormSchema, type ProformaFormData } from '@/lib/validations/proformas'
import { CURRENCIES } from '@/lib/constants'
import { SHIPPING_TERMS } from '@/lib/constants/shipping-terms'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type FormData = z.infer<typeof proformaFormSchema>

interface ClientOption  { id: string; name: string }
interface SubunitOption { id: string; client_id: string; name: string }
interface ProductOption { id: string; name: string; description: string | null; unit_price: number; currency: string }

interface ProformaEditorProps {
  proformaId?:         string
  defaultCurrency:     string
  clients:             ClientOption[]
  subunits?:           SubunitOption[]
  products?:           ProductOption[]
  defaultValues?:      Partial<ProformaFormData>
  nextProformaNumber?: string
}

export function ProformaEditor({
  proformaId, defaultCurrency, clients, subunits = [], products = [], defaultValues, nextProformaNumber,
}: ProformaEditorProps) {
  const router = useRouter()
  const isEdit = !!proformaId
  const [isPending, startTransition] = useTransition()
  const [catalogOpen,   setCatalogOpen]   = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  const form = useForm<FormData>({
    resolver: zodResolver(proformaFormSchema),
    defaultValues: {
      client_id:              defaultValues?.client_id              ?? '',
      client_subunit_id:      defaultValues?.client_subunit_id      ?? '',
      proforma_number:        defaultValues?.proforma_number        ?? nextProformaNumber ?? '',
      issue_date:              defaultValues?.issue_date             ?? new Date().toISOString().slice(0, 10),
      expiry_date:             defaultValues?.expiry_date            ?? '',
      currency:                defaultValues?.currency               ?? defaultCurrency,
      tax_type:                defaultValues?.tax_type               ?? 'none',
      tax_rate:                defaultValues?.tax_rate               ?? 0,
      discount_amount:         defaultValues?.discount_amount        ?? 0,
      shipping_terms:          defaultValues?.shipping_terms         ?? '',
      local_transport_amount: defaultValues?.local_transport_amount ?? 0,
      notes:                   defaultValues?.notes                  ?? '',
      terms:                   defaultValues?.terms                  ?? '',
      is_simplified:           defaultValues?.is_simplified           ?? false,
      items: defaultValues?.items?.length
        ? defaultValues.items
        : [{ description: '', quantity: 1, unit_price: 0, hs_code: '', country_of_origin: '', sort_order: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  const watchedItems           = useWatch({ control: form.control, name: 'items' })
  const watchedDiscount        = useWatch({ control: form.control, name: 'discount_amount' })
  const watchedTaxRate         = useWatch({ control: form.control, name: 'tax_rate' })
  const watchedTaxType         = useWatch({ control: form.control, name: 'tax_type' })
  const watchedCurrency        = useWatch({ control: form.control, name: 'currency' })
  const watchedClientId        = useWatch({ control: form.control, name: 'client_id' })
  const watchedLocalTransport  = useWatch({ control: form.control, name: 'local_transport_amount' })

  const clientSubunits = subunits.filter(s => s.client_id === watchedClientId)

  const subtotal  = watchedItems.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0)
  const afterDisc = Math.max(0, subtotal - (watchedDiscount || 0))
  const taxAmount = watchedTaxType !== 'none' ? afterDisc * ((watchedTaxRate || 0) / 100) : 0
  const total     = afterDisc + taxAmount + (watchedLocalTransport || 0)

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateProformaAction(proformaId!, data)
        : await createProformaAction(data)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

      {/* Header details */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Proforma details</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          <div className="space-y-1.5">
            <Label>Client <span className="text-destructive">*</span></Label>
            <Select
              value={form.watch('client_id')}
              onValueChange={v => { form.setValue('client_id', v); form.setValue('client_subunit_id', '') }}
            >
              <SelectTrigger aria-invalid={!!form.formState.errors.client_id}>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.client_id && (
              <p className="text-xs text-destructive">{form.formState.errors.client_id.message}</p>
            )}
          </div>

          {clientSubunits.length > 0 && (
            <div className="space-y-1.5">
              <Label>Sub unit</Label>
              <Controller
                control={form.control}
                name="client_subunit_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Client default" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientSubunits.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="proforma_number">Proforma number <span className="text-destructive">*</span></Label>
            <Input id="proforma_number" {...form.register('proforma_number')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issue_date">Issue date <span className="text-destructive">*</span></Label>
            <Input id="issue_date" type="date" {...form.register('issue_date')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expiry_date">Valid until (expiry)</Label>
            <Input id="expiry_date" type="date" {...form.register('expiry_date')} />
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
        </div>
      </div>

      {/* Trading fields */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Shipping</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Shipping terms</Label>
            <Controller
              control={form.control}
              name="shipping_terms"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_TERMS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="local_transport_amount">Local transport</Label>
            <Input
              id="local_transport_amount" type="number" min="0" step="0.01" placeholder="0.00"
              {...form.register('local_transport_amount', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Line items</h2>

        <div className="hidden sm:grid grid-cols-[1fr_70px_100px_80px_90px_36px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
          <span>Description</span><span>Qty</span><span>Unit price</span><span>HS code</span><span>Origin</span><span />
        </div>

        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_70px_100px_80px_90px_36px] items-start">
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
                type="number" step="0.001" min="0" placeholder="1"
                {...form.register(`items.${i}.quantity`, { valueAsNumber: true })}
              />
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                {...form.register(`items.${i}.unit_price`, { valueAsNumber: true })}
              />
              <Input
                placeholder="8471.30"
                {...form.register(`items.${i}.hs_code`)}
              />
              <Input
                placeholder="CN"
                maxLength={2}
                {...form.register(`items.${i}.country_of_origin`)}
              />
              <Button
                type="button" variant="ghost" size="icon"
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
            type="button" variant="outline" size="sm"
            onClick={() => append({ description: '', quantity: 1, unit_price: 0, hs_code: '', country_of_origin: '', sort_order: fields.length })}
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
                        key={p.id} type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          append({ description: p.description || p.name, quantity: 1, unit_price: p.unit_price, hs_code: '', country_of_origin: '', sort_order: fields.length })
                          setCatalogOpen(false); setCatalogSearch('')
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
          {(watchedLocalTransport || 0) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Local transport</span>
              <span>{formatCurrency(watchedLocalTransport || 0, watchedCurrency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span><span>{formatCurrency(total, watchedCurrency)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">Simplified proforma (tax included, not itemized)</p>
            <p className="text-xs text-muted-foreground">
              Hides the tax line on the PDF and shows a note that amounts include tax. Doesn't change the total.
            </p>
          </div>
          <Controller
            control={form.control}
            name="is_simplified"
            render={({ field }) => (
              <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>

      {/* Tax & discount */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Tax &amp; discount</h2>
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
                id="tax_rate" type="number" step="0.01" min="0" max="100" placeholder="0"
                {...form.register('tax_rate', { valueAsNumber: true })}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="discount_amount">Discount amount</Label>
            <Input
              id="discount_amount" type="number" step="0.01" min="0" placeholder="0.00"
              {...form.register('discount_amount', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Notes &amp; Terms</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} placeholder="Thank you for considering our services!" {...form.register('notes')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="terms">Terms &amp; conditions</Label>
            <Textarea id="terms" rows={4} placeholder="This proforma is valid for 30 days…" {...form.register('terms')} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/proformas')} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create proforma'}
        </Button>
      </div>
    </form>
  )
}
