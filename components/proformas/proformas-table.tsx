'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Send, Eye, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { ProformaStatusBadge } from '@/components/proformas/proforma-status-badge'
import {
  deleteProformaAction, sendProformaEmailAction, convertProformaToInvoiceAction,
} from '@/app/actions/proformas'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { Proforma, ProformaStatus } from '@/types/database'

type ProformaRow = Pick<Proforma,
  'id' | 'proforma_number' | 'status' | 'total' | 'currency' |
  'issue_date' | 'expiry_date' | 'share_token' | 'approved_at'
> & { client_name: string }

interface ProformasTableProps {
  proformas:          ProformaRow[]
  approvalRequired?:  boolean
  soleApprover?:      boolean
}

const TABS: { key: string; label: string; statuses: ProformaStatus[] | null }[] = [
  { key: 'all',              label: 'All',           statuses: null },
  { key: 'draft',            label: 'Draft',         statuses: ['draft'] },
  { key: 'pending_approval', label: 'Pending approval', statuses: ['pending_approval'] },
  { key: 'open',             label: 'Sent',          statuses: ['sent', 'viewed'] },
  { key: 'accepted',         label: 'Accepted',      statuses: ['accepted'] },
  { key: 'converted',        label: 'Converted',     statuses: ['converted'] },
  { key: 'expired',          label: 'Expired',       statuses: ['expired'] },
]

export function ProformasTable({ proformas, approvalRequired = false, soleApprover = false }: ProformasTableProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [isPending, startTransition] = useTransition()

  const filtered = TABS.find(t => t.key === activeTab)?.statuses
    ? proformas.filter(p => TABS.find(t => t.key === activeTab)!.statuses!.includes(p.status as ProformaStatus))
    : proformas

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteProformaAction(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Proforma deleted.'); router.refresh() }
    })
  }

  const handleSend = (id: string) => {
    startTransition(async () => {
      const result = await sendProformaEmailAction(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Proforma sent!'); router.refresh() }
    })
  }

  const handleConvert = (id: string) => {
    startTransition(async () => {
      const result = await convertProformaToInvoiceAction(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Invoice created!'); router.push(`/invoices/${result.invoiceId}/edit`) }
    })
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No proformas in this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Number</th>
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Client</th>
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Issue date</th>
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Valid until</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Total</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(pf => (
                  <tr key={pf.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/proformas/${pf.id}`} className="font-semibold hover:text-primary">
                        {pf.proforma_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{pf.client_name}</td>
                    <td className="py-3 px-4">
                      <ProformaStatusBadge status={pf.status as ProformaStatus} />
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(pf.issue_date)}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {pf.expiry_date ? formatDate(pf.expiry_date) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(pf.total, pf.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/proformas/${pf.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>

                        {pf.status === 'draft' && (!approvalRequired || soleApprover || !!pf.approved_at) && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <Link href={`/proformas/${pf.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8"
                              disabled={isPending}
                              onClick={() => handleSend(pf.id)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        {pf.status === 'accepted' && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8"
                            disabled={isPending}
                            title="Convert to invoice"
                            onClick={() => handleConvert(pf.id)}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {pf.share_token && ['sent', 'viewed'].includes(pf.status) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`/pr/${pf.share_token}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete proforma?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {pf.proforma_number}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(pf.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
