'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { recordPaymentAction } from '@/app/actions/payments'

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash',          label: 'Cash' },
  { value: 'check',         label: 'Check' },
  { value: 'card',          label: 'Card' },
  { value: 'paypal',        label: 'PayPal' },
  { value: 'crypto',        label: 'Crypto' },
  { value: 'other',         label: 'Other' },
]

const schema = z.object({
  amount:         z.number({ invalid_type_error: 'Enter an amount' }).positive('Must be greater than zero'),
  payment_method: z.enum(['bank_transfer', 'card', 'cash', 'check', 'paypal', 'crypto', 'other']),
  payment_date:   z.string().min(1, 'Payment date is required'),
  reference:      z.string().max(255).optional().or(z.literal('')),
  notes:          z.string().max(1000).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

interface RecordPaymentDialogProps {
  invoiceId:   string
  amountDue:   number
  currency:    string
  disabled?:   boolean
}

export function RecordPaymentDialog({
  invoiceId, amountDue, currency, disabled,
}: RecordPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount:         amountDue,
      payment_method: 'bank_transfer',
      payment_date:   today,
      reference:      '',
      notes:          '',
    },
  })

  async function onSubmit(data: FormData) {
    const result = await recordPaymentAction(invoiceId, data)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(
        data.amount >= amountDue - 0.001
          ? 'Invoice marked as paid.'
          : `Payment of ${currency} ${data.amount.toFixed(2)} recorded.`,
      )
      setOpen(false)
      form.reset({ amount: amountDue, payment_method: 'bank_transfer', payment_date: today, reference: '', notes: '' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <CheckCircle className="mr-2 h-4 w-4" /> Record payment
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Log a payment received from the client. The invoice status will update automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">
              Amount ({currency})
              {amountDue > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  · {amountDue.toFixed(2)} remaining
                </span>
              )}
            </Label>
            <Input
              id="amount" type="number" step="0.01" min="0.01"
              {...form.register('amount', { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_method">Payment method</Label>
            <select id="payment_method" className={SELECT_CLS} {...form.register('payment_method')}>
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Payment date */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_date">Payment date</Label>
            <Input id="payment_date" type="date" {...form.register('payment_date')} />
            {form.formState.errors.payment_date && (
              <p className="text-xs text-destructive">{form.formState.errors.payment_date.message}</p>
            )}
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="reference"
              placeholder="Transaction ID, cheque number, etc."
              {...form.register('reference')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="notes" rows={2} placeholder="Any additional notes…" {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
