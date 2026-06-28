'use client'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { recurringFormSchema, type RecurringFormData } from '@/lib/validations/recurring'
import { createRecurringAction, updateRecurringAction } from '@/app/actions/recurring'
import { CURRENCIES } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

const FREQUENCIES = [
  { value: 'weekly',    label: 'Weekly' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly' },
]

const DUE_DAYS = [
  { value: 7,   label: 'Net 7' },
  { value: 14,  label: 'Net 14' },
  { value: 30,  label: 'Net 30' },
  { value: 45,  label: 'Net 45' },
  { value: 60,  label: 'Net 60' },
  { value: 90,  label: 'Net 90' },
]

const TAX_TYPES = [
  { value: 'none',      label: 'No tax' },
  { value: 'vat',       label: 'VAT' },
  { value: 'gst',       label: 'GST' },
  { value: 'sales_tax', label: 'Sales Tax' },
]

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50'

interface Client { id: string; name: string }

interface RecurringFormProps {
  clients:         Client[]
  defaultCurrency: string
  id?:             string
  defaultValues?:  Partial<RecurringFormData>
}

export function RecurringForm({ clients, defaultCurrency, id, defaultValues }: RecurringFormProps) {
  const router  = useRouter()
  const [error, setError] = useState<string | null>(null)
  const isEdit  = !!id

  const today = new Date().toISOString().slice(0, 10)

  const form = useForm<RecurringFormData>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: {
      title:                '',
      client_id:            '',
      frequency:            'monthly',
      next_issue_date:      today,
      due_days:             30,
      currency:             defaultCurrency,
      tax_type:             'none',
      tax_rate:             0,
      discount_amount:      0,
      notes:                '',
      payment_instructions: '',
      items:                [{ description: '', quantity: 1, unit_price: 0 }],
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  const watchedItems    = useWatch({ control: form.control, name: 'items' })
  const watchedTaxType  = useWatch({ control: form.control, name: 'tax_type' })
  const watchedTaxRate  = useWatch({ control: form.control, name: 'tax_rate' })
  const watchedDiscount = useWatch({ control: form.control, name: 'discount_amount' })
  const watchedCurrency = useWatch({ control: form.control, name: 'currency' })

  const subtotal  = (watchedItems ?? []).reduce((s, i) => s + ((i.quantity ?? 0) * (i.unit_price ?? 0)), 0)
  const discount  = Math.min(watchedDiscount ?? 0, subtotal)
  const taxBase   = subtotal - discount
  const tax       = (watchedTaxType !== 'none' && (watchedTaxRate ?? 0) > 0)
    ? taxBase * ((watchedTaxRate ?? 0) / 100)
    : 0
  const total     = taxBase + tax

  async function onSubmit(data: RecurringFormData) {
    setError(null)
    const result = isEdit
      ? await updateRecurringAction(id!, data)
      : await createRecurringAction(data)

    if (result?.error) {
      setError(result.error)
    } else if (isEdit) {
      router.refresh()
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Schedule basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="e.g. Monthly retainer — Acme Corp"
              {...form.register('title')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client_id">Client *</Label>
            <select id="client_id" className={SELECT_CLS} {...form.register('client_id')}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {form.formState.errors.client_id && (
              <p className="text-xs text-destructive">{form.formState.errors.client_id.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="frequency">Frequency *</Label>
            <select id="frequency" className={SELECT_CLS} {...form.register('frequency')}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="next_issue_date">Next issue date *</Label>
            <Input
              id="next_issue_date" type="date"
              {...form.register('next_issue_date')}
            />
            {form.formState.errors.next_issue_date && (
              <p className="text-xs text-destructive">{form.formState.errors.next_issue_date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due_days">Payment terms</Label>
            <select
              id="due_days" className={SELECT_CLS}
              {...form.register('due_days', { valueAsNumber: true })}
            >
              {DUE_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency *</Label>
            <select id="currency" className={SELECT_CLS} {...form.register('currency')}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header row */}
          <div className="hidden grid-cols-[1fr_80px_100px_80px] gap-2 sm:grid">
            <span className="text-xs font-medium text-muted-foreground">Description</span>
            <span className="text-xs font-medium text-muted-foreground">Qty</span>
            <span className="text-xs font-medium text-muted-foreground">Unit price</span>
            <span className="text-xs font-medium text-muted-foreground text-right">Amount</span>
          </div>

          {fields.map((field, idx) => {
            const qty   = watchedItems?.[idx]?.quantity   ?? 0
            const price = watchedItems?.[idx]?.unit_price ?? 0
            const amount = qty * price
            return (
              <div key={field.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_80px_100px_80px_auto]">
                <Input
                  placeholder="Description"
                  {...form.register(`items.${idx}.description`)}
                />
                <Input
                  type="number" min="0" step="0.01" placeholder="Qty"
                  className="w-20"
                  {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                />
                <Input
                  type="number" min="0" step="0.01" placeholder="Price"
                  className="w-28"
                  {...form.register(`items.${idx}.unit_price`, { valueAsNumber: true })}
                />
                <div className="hidden items-center justify-end text-sm font-medium sm:flex">
                  {formatCurrency(amount, watchedCurrency ?? defaultCurrency)}
                </div>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => fields.length > 1 && remove(idx)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}

          {form.formState.errors.items?.root && (
            <p className="text-xs text-destructive">{form.formState.errors.items.root.message}</p>
          )}

          <Button
            type="button" variant="outline" size="sm"
            onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
          >
            <PlusIcon className="mr-2 h-3.5 w-3.5" /> Add item
          </Button>

          {/* Totals */}
          <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal, watchedCurrency ?? defaultCurrency)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">−{formatCurrency(discount, watchedCurrency ?? defaultCurrency)}</span>
              </div>
            )}

            {watchedTaxType !== 'none' && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {TAX_TYPES.find(t => t.value === watchedTaxType)?.label ?? 'Tax'}
                  </span>
                  <Input
                    type="number" min="0" max="100" step="0.01"
                    className="h-7 w-16 text-xs"
                    {...form.register('tax_rate', { valueAsNumber: true })}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <span>{formatCurrency(tax, watchedCurrency ?? defaultCurrency)}</span>
              </div>
            )}

            <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total, watchedCurrency ?? defaultCurrency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax & discount */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax &amp; discount</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tax_type">Tax type</Label>
            <select id="tax_type" className={SELECT_CLS} {...form.register('tax_type')}>
              {TAX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discount_amount">Discount ({watchedCurrency ?? defaultCurrency})</Label>
            <Input
              id="discount_amount" type="number" min="0" step="0.01" placeholder="0.00"
              {...form.register('discount_amount', { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes &amp; payment instructions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} placeholder="Internal notes…" {...form.register('notes')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment_instructions">Payment instructions</Label>
            <Textarea
              id="payment_instructions" rows={3}
              placeholder="Bank details, payment link…"
              {...form.register('payment_instructions')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? (isEdit ? 'Saving…' : 'Creating…')
            : (isEdit ? 'Save changes' : 'Create schedule')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
