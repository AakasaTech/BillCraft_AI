'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, FileText, LayoutTemplate } from 'lucide-react'
import { toast } from 'sonner'
import { deleteTemplateAction } from '@/app/actions/templates'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { InvoiceTemplate, InvoiceTemplateItem } from '@/types/database'

interface TemplateRow extends InvoiceTemplate {
  items: InvoiceTemplateItem[]
}

interface TemplatesTableProps {
  templates: TemplateRow[]
}

export function TemplatesTable({ templates }: TemplatesTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteTemplateAction(id)
      toast.success('Template deleted.')
    })
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16 text-center">
        <LayoutTemplate className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">No templates yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a template to speed up repeat invoicing.
        </p>
      </div>
    )
  }

  const templateTotal = (t: TemplateRow) => {
    const subtotal = t.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const afterDisc = Math.max(0, subtotal - t.discount_amount)
    const tax = t.tax_type !== 'none' ? afterDisc * (t.tax_rate / 100) : 0
    return afterDisc + tax
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
            <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Est. total</th>
            <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Due days</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {templates.map(t => (
            <tr key={t.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground sm:hidden">
                  {t.items.length} item{t.items.length !== 1 ? 's' : ''} ·{' '}
                  {formatCurrency(templateTotal(t), t.currency)}
                </p>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                {t.items.length} item{t.items.length !== 1 ? 's' : ''}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 font-medium">
                {formatCurrency(templateTotal(t), t.currency)}
              </td>
              <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                {t.due_days != null ? `Net ${t.due_days}` : '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/invoices/new?template=${t.id}`)}
                    disabled={isPending}
                    title="Create invoice from template"
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Use</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/templates/${t.id}/edit`)}
                    disabled={isPending}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id, t.name)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
