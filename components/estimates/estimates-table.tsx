'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Send, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { EstimateStatusBadge } from '@/components/estimates/estimate-status-badge'
import { deleteEstimateAction, sendEstimateEmailAction } from '@/app/actions/estimates'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { Estimate, EstimateStatus } from '@/types/database'

type EstimateRow = Pick<Estimate,
  'id' | 'estimate_number' | 'status' | 'total' | 'currency' |
  'issue_date' | 'expiry_date' | 'share_token'
> & { client_name: string }

interface EstimatesTableProps {
  estimates: EstimateRow[]
}

const TABS: { key: string; label: string; statuses: EstimateStatus[] | null }[] = [
  { key: 'all',      label: 'All',       statuses: null },
  { key: 'draft',    label: 'Draft',     statuses: ['draft'] },
  { key: 'open',     label: 'Sent',      statuses: ['sent', 'viewed'] },
  { key: 'accepted', label: 'Accepted',  statuses: ['accepted'] },
  { key: 'declined', label: 'Declined',  statuses: ['declined', 'expired'] },
]

export function EstimatesTable({ estimates }: EstimatesTableProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [isPending, startTransition] = useTransition()

  const filtered = TABS.find(t => t.key === activeTab)?.statuses
    ? estimates.filter(e => TABS.find(t => t.key === activeTab)!.statuses!.includes(e.status as EstimateStatus))
    : estimates

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteEstimateAction(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Estimate deleted.'); router.refresh() }
    })
  }

  const handleSend = (id: string) => {
    startTransition(async () => {
      const result = await sendEstimateEmailAction(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Estimate sent!'); router.refresh() }
    })
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
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
            No estimates in this category.
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
                {filtered.map(est => (
                  <tr key={est.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/estimates/${est.id}`} className="font-semibold hover:text-primary">
                        {est.estimate_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{est.client_name}</td>
                    <td className="py-3 px-4">
                      <EstimateStatusBadge status={est.status as EstimateStatus} />
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(est.issue_date)}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {est.expiry_date ? formatDate(est.expiry_date) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(est.total, est.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/estimates/${est.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>

                        {est.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <Link href={`/estimates/${est.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8"
                              disabled={isPending}
                              onClick={() => handleSend(est.id)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        {est.share_token && ['sent', 'viewed'].includes(est.status) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`/e/${est.share_token}`} target="_blank" rel="noopener noreferrer">
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
                              <AlertDialogTitle>Delete estimate?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {est.estimate_number}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(est.id)}
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
