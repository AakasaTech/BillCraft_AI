'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EXPENSE_CATEGORY_LABEL } from '@/lib/expenses'
import { ExpenseFormDialog } from './expense-form-dialog'
import { deleteExpenseAction } from '@/app/actions/expenses'
import type { Expense } from '@/types/database'

interface Props {
  expenses: Expense[]
  defaultCurrency: string
}

export function ExpensesClient({ expenses, defaultCurrency }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    if (!confirm('Delete this expense? This cannot be undone.')) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteExpenseAction(id)
      setDeletingId(null)
    })
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track business expenses for P&amp;L reporting.</p>
        </div>
        <ExpenseFormDialog defaultCurrency={defaultCurrency} />
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
            <ExpenseFormDialog defaultCurrency={defaultCurrency} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">
              {expenses.length} expense{expenses.length === 1 ? '' : 's'}
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-3 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Category</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Description</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Vendor</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-3 tabular-nums text-muted-foreground">
                        {formatDate(exp.date)}
                      </td>
                      <td className="px-6 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {EXPENSE_CATEGORY_LABEL[exp.category] ?? exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-3">{exp.description}</td>
                      <td className="px-6 py-3 text-muted-foreground">{exp.vendor ?? '—'}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium">
                        {formatCurrency(Number(exp.amount), exp.currency)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1">
                          <ExpenseFormDialog
                            defaultCurrency={defaultCurrency}
                            expense={exp}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={deletingId === exp.id && isPending}
                            onClick={() => handleDelete(exp.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30">
                    <td
                      colSpan={4}
                      className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Total
                    </td>
                    <td className="px-6 py-3 text-right font-bold tabular-nums">
                      {formatCurrency(total, defaultCurrency)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
