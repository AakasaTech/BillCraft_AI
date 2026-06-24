'use client'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  Loader2, PlusIcon, Trash2Icon, SparklesIcon,
  ChevronDownIcon, ChevronUpIcon, BookOpenIcon, Package, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { invoiceFormSchema, type InvoiceFormData } from '@/lib/validations/invoices'
import { createInvoiceAction, updateInvoiceAction } from '@/app/actions/invoices'
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

interface ClientOption { id: string; name: string }
interface PaymentInstructionTemplate { name: string; content: string }
interface ProductOption { id: string; name: string; description: string | null; unit_price: number; currency: string }

interface InvoiceEditorProps {
  clients:                    ClientOption[]
  defaultCurrency:            string
  nextInvoiceNumber:          string
  invoiceId?:                 string
  defaultValues?:             Partial<InvoiceFormData>
  savedPaymentInstructions?:  PaymentInstructionTemplate[]
  products?:                  ProductOption[]
}

const today   = () => new Date().toISOString().split('T')[0]
const in30    = () => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

export function InvoiceEditor({
  clients,
  defaultCurrency,
  nextInvoiceNumber,
  invoiceId,
  defaultValues,
  savedPaymentInstructions = [],
  products = [],
}: InvoiceEditorProps) {
  const router   = useRouter()
  const isEdit   = !!invoiceId
  const [isPending, startTransition] = useTransition()

  // AI panel state
  const [aiOpen,    setAiOpen]    = useState(!isEdit)
  const [aiPrompt,  setAiPrompt]  = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Catalog picker state
  const [catalogOpen,   setCatalogOpen]   = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultValues ?? {
      client_id:            '',
      invoice_number:       nextInvoiceNumber,
      issue_date:           today(),
      due_date:             in30(),
      currency:             defaultCurrency,
      tax_type:             'none',
      tax_rate:             0,
      discount_amount:      0,
      notes:                '',
      payment_instructions: '',
      items: [{ description: '', quantity: 1, unit_price: 0, sort_order: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  const watchedItems    = useWatch({ control: form.control, name: 'items' })
  const watchedDiscount = useWatch({ control: form.control, name: 'discount_amount' })
  const watchedTaxRate  = useWatch({ control: form.control, name: 'tax_rate' })
  const watchedCurrency = useWatch({ control: form.control, name: 'currency' })

  const safe = (n: number) => Number.isFinite(n) ? n : 0
  const subtotal  = (watchedItems ?? []).reduce((s, i) => s + safe(i.quantity * i.unit_price), 0)
  const discount  = Math.min(safe(watchedDiscount ?? 0), subtotal)
  const taxBase   = subtotal - discount
  const taxAmount = safe((watchedTaxRate ?? 0) > 0 ? taxBase * ((watchedTaxRate ?? 0) / 100) : 0)
  const total     = taxBase + taxAmount
  const cur       = watchedCurrency ?? defaultCurrency

  // ── AI extraction ───────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/extract-invoice', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          prompt:   aiPrompt,
          clients:  clients.map(c => ({ id: c.id, name: c.name })),
          currency: defaultCurrency,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()

      if (data.client_id)            form.setValue('client_id',            data.client_id)
      if (data.currency)             form.setValue('currency',             data.currency)
      if (data.issue_date)           form.setValue('issue_date',           data.issue_date)
      if (data.due_date)             form.setValue('due_date',             data.due_date)
      if (data.notes)                form.setValue('notes',                data.notes)
      if (data.payment_instructions) form.setValue('payment_instructions', data.payment_instructions)
      if (data.items?.length > 0) {
        form.setValue('items', data.items.map((item: { description: string; quantity: number; unit_price: number }, i: number) => ({
          description: item.description,
          quantity:    item.quantity,
          unit_price:  item.unit_price,
          sort_order:  i,
        })))
      }

      const score = data.confidence?.overall ?? 0
      if      (score >= 0.85) toast.success('Invoice extracted — looks good.')
      else if (score >= 0.60) toast.warning(`Extracted with ${Math.round(score * 100)}% confidence. Please review the fields.`)
      else                    toast.error(`Low confidence (${Math.round(score * 100)}%). Fill in missing details manually.`)

      setAiOpen(false)
    } catch {
      toast.error('AI extraction failed. Please try again or fill in manually.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = (data: InvoiceFormData) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateInvoiceAction(invoiceId!, data)
        : await createInvoiceAction(data)

      if (result?.error) {
        toast.error(result.error)
        return
      }
      if (isEdit) {
        toast.success('Invoice updated.')
        router.push(`/invoices/${invoiceId}`)
      }
      // createInvoiceAction redirects automatically
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

      {/* ── AI Panel ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card">
        <button
          type="button"
          onClick={() => setAiOpen(v => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Generate with AI</span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Describe the invoice in plain language
            </span>
          </div>
          {aiOpen
            ? <ChevronUpIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </button>

        {aiOpen && (
          <div className="space-y-3 border-t p-4">
            <Textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder='e.g. "Invoice Acme Corp for 10 hours of design at $120/hr and 2 hours of revisions at $80/hr. Due in 30 days."'
              rows={3}
              className="resize-none"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExtract}
              disabled={aiLoading || !aiPrompt.trim()}
            >
              {aiLoading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <SparklesIcon className="mr-2 h-4 w-4" />}
              {aiLoading ? 'Extracting…' : 'Extract invoice data'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Invoice details ──────────────────────────────────────────────────── */}
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice details</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Controller
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger aria-invalid={!!form.formState.errors.client_id}>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0
                      ? <SelectItem value="__none__" disabled>No clients — add one first</SelectItem>
                      : clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.client_id && (
              <p className="text-xs text-destructive">{form.formState.errors.client_id.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invoice_number">Invoice number *</Label>
            <Input
              id="invoice_number"
              aria-invalid={!!form.formState.errors.invoice_number}
              {...form.register('invoice_number')}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="issue_date">Issue date *</Label>
            <Input id="issue_date" type="date" {...form.register('issue_date')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Due date</Label>
            <Input id="due_date" type="date" {...form.register('due_date')} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency *</Label>
            <Controller
              control={form.control}
              name="currency"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      {/* ── Line items ───────────────────────────────────────────────────────── */}
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line items</p>

        {typeof (form.formState.errors.items as { message?: string })?.message === 'string' && (
          <p className="text-xs text-destructive">{(form.formState.errors.items as { message?: string }).message}</p>
        )}

        {/* Desktop header */}
        <div className="hidden sm:grid grid-cols-[1fr_80px_120px_100px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
          <span>Description</span><span>Qty</span><span>Unit price</span>
          <span className="text-right">Amount</span><span />
        </div>

        <div className="space-y-3">
          {fields.map((field, idx) => {
            const qty   = safe((watchedItems?.[idx]?.quantity ?? 0))
            const price = safe((watchedItems?.[idx]?.unit_price ?? 0))
            const amt   = qty * price
            return (
              <div key={field.id} className="grid grid-cols-[1fr_36px] gap-2 sm:grid-cols-[1fr_80px_120px_100px_36px] sm:items-center">
                <Input
                  placeholder="Description"
                  aria-invalid={!!form.formState.errors.items?.[idx]?.description}
                  {...form.register(`items.${idx}.description`)}
                />
                {/* Single qty input — always mounted, layout shifts on mobile via CSS order */}
                <Input
                  type="number" min="0" step="0.01" placeholder="Qty"
                  className="col-start-1 sm:col-start-auto"
                  {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                />
                <Input
                  type="number" min="0" step="0.01" placeholder="Unit price"
                  className="col-start-1 sm:col-start-auto"
                  {...form.register(`items.${idx}.unit_price`, { valueAsNumber: true })}
                />
                <p className="col-start-1 text-right text-sm font-medium sm:col-start-auto">
                  {formatCurrency(amt, cur)}
                </p>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="col-start-2 row-start-1 h-9 w-9 self-start text-muted-foreground hover:text-destructive sm:col-start-auto sm:row-start-auto sm:self-auto"
                  onClick={() => remove(idx)}
                  disabled={fields.length === 1}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => append({ description: '', quantity: 1, unit_price: 0, sort_order: fields.length })}
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add item
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

        <Separator />

        {/* Totals */}
        <div className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, cur)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Discount</span>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">{cur}</span>
              <Input
                type="number" min="0" step="0.01"
                className="h-7 w-24 text-right"
                {...form.register('discount_amount', { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Tax</span>
              <Input
                type="number" min="0" max="100" step="0.1"
                className="h-7 w-16 text-right"
                {...form.register('tax_rate', { valueAsNumber: true })}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <span>{formatCurrency(taxAmount, cur)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>{formatCurrency(total, cur)}</span>
          </div>
        </div>
      </div>

      {/* ── Notes + Payment instructions ─────────────────────────────────────── */}
      <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes" rows={4} className="resize-none"
            placeholder="Thank you for your business…"
            {...form.register('notes')}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="payment_instructions">Payment instructions</Label>
            {savedPaymentInstructions.length > 0 && (
              <div className="relative">
                <select
                  className="appearance-none rounded-md border bg-background px-2 py-1 pr-6 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  defaultValue=""
                  onChange={e => {
                    const tpl = savedPaymentInstructions.find(t => t.name === e.target.value)
                    if (tpl) {
                      form.setValue('payment_instructions', tpl.content, { shouldDirty: true })
                      e.target.value = ''
                    }
                  }}
                >
                  <option value="" disabled>Load template</option>
                  {savedPaymentInstructions.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <BookOpenIcon className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
            )}
          </div>
          <Textarea
            id="payment_instructions" rows={4} className="resize-none"
            placeholder={"Bank: Example Bank\nAccount: 123456789\nSWIFT: EXMPLXX"}
            {...form.register('payment_instructions')}
          />
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create invoice'}
        </Button>
      </div>
    </form>
  )
}
