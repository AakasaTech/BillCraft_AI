'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { EXPENSE_CATEGORIES } from '@/lib/expenses'
import { createExpenseAction, updateExpenseAction, type ExpenseInput } from '@/app/actions/expenses'
import type { Expense, ExpenseCategory } from '@/types/database'

const INPUT_CLS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background ' +
  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const SELECT_CLS =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background ' +
  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

interface Props {
  defaultCurrency: string
  expense?: Expense
  trigger?: React.ReactNode
}

function blankForm(defaultCurrency: string, expense?: Expense): ExpenseInput {
  const today = new Date().toISOString().slice(0, 10)
  return {
    date:        expense?.date        ?? today,
    category:    (expense?.category   ?? 'other') as ExpenseCategory,
    description: expense?.description ?? '',
    amount:      expense ? Number(expense.amount) : 0,
    currency:    expense?.currency    ?? defaultCurrency,
    vendor:      expense?.vendor      ?? '',
    notes:       expense?.notes       ?? '',
  }
}

export function ExpenseFormDialog({ defaultCurrency, expense, trigger }: Props) {
  const [open, setOpen]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm]       = useState<ExpenseInput>(() => blankForm(defaultCurrency, expense))
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (v) {
      setError(null)
      setForm(blankForm(defaultCurrency, expense))
    }
  }

  function set<K extends keyof ExpenseInput>(key: K, value: ExpenseInput[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = expense
        ? await updateExpenseAction(expense.id, form)
        : await createExpenseAction(form)
      if (result.error) setError(result.error)
      else setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category *</label>
              <select
                required
                value={form.category}
                onChange={e => set('category', e.target.value as ExpenseCategory)}
                className={SELECT_CLS}
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description *</label>
            <input
              type="text"
              required
              maxLength={500}
              placeholder="e.g. Figma subscription"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className={INPUT_CLS}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount || ''}
                onChange={e => set('amount', parseFloat(e.target.value) || 0)}
                className={INPUT_CLS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Currency</label>
              <input
                type="text"
                maxLength={3}
                placeholder="USD"
                value={form.currency}
                onChange={e => set('currency', e.target.value.toUpperCase())}
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Vendor</label>
            <input
              type="text"
              maxLength={255}
              placeholder="e.g. Google LLC"
              value={form.vendor ?? ''}
              onChange={e => set('vendor', e.target.value)}
              className={INPUT_CLS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              rows={2}
              maxLength={5000}
              placeholder="Optional notes…"
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              className={cn(INPUT_CLS, 'h-auto resize-none py-2')}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : expense ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
