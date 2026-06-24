import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { EstimateRespondForm } from '@/components/estimates/estimate-respond-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Estimate, EstimateItem, Client, Organization, EstimateStatus } from '@/types/database'

export const metadata = {
  title: 'Estimate',
  robots: 'noindex, nofollow',
}

const STATUS_LABEL: Record<EstimateStatus, string> = {
  draft:    'Draft',
  sent:     'Pending your response',
  viewed:   'Pending your response',
  accepted: 'Accepted',
  declined: 'Declined',
  expired:  'Expired',
}

const STATUS_STYLE: Record<EstimateStatus, string> = {
  draft:    'bg-muted text-muted-foreground',
  sent:     'bg-amber-100 text-amber-700',
  viewed:   'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired:  'bg-muted text-muted-foreground',
}

export default async function PublicEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase  = createServiceClient()

  const { data: estimateRaw } = await supabase
    .from('estimates')
    .select('*, clients(*)')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (!estimateRaw) notFound()

  const [{ data: orgRaw }, { data: itemsRaw }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', estimateRaw.organization_id).single(),
    supabase.from('estimate_items').select('*').eq('estimate_id', estimateRaw.id).order('sort_order'),
  ])

  // Mark as viewed on first open (sent → viewed)
  if (estimateRaw.status === 'sent') {
    await supabase
      .from('estimates')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', estimateRaw.id)
  }

  const estimate = estimateRaw as Estimate & { clients: Client | null }
  const client   = estimate.clients
  const org      = orgRaw as Organization | null
  const items    = (itemsRaw ?? []) as EstimateItem[]
  const status   = estimate.status as EstimateStatus

  const canRespond = status === 'sent' || status === 'viewed'

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-3xl">

        {/* Org header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {org?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org.name} className="h-10 w-auto max-w-[120px] object-contain" />
            )}
            <div>
              {org && <p className="text-lg font-bold">{org.name}</p>}
              {org?.address_line1 && (
                <p className="text-xs text-muted-foreground">{org.address_line1}</p>
              )}
            </div>
          </div>
          <a
            href={`/api/e/${token}/pdf`}
            download
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </a>
        </div>

        {/* Responded banner */}
        {(status === 'accepted' || status === 'declined') && (
          <div className={`mb-4 rounded-xl p-4 text-sm font-medium ${
            status === 'accepted' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {status === 'accepted'
              ? 'You accepted this estimate. The vendor will follow up shortly.'
              : `You declined this estimate.${estimate.response_note ? ` Your note: "${estimate.response_note}"` : ''}`}
          </div>
        )}

        {status === 'expired' && (
          <div className="mb-4 rounded-xl border bg-muted/50 p-4 text-sm text-muted-foreground">
            This estimate has expired. Please contact {org?.name ?? 'the vendor'} for an updated quote.
          </div>
        )}

        {/* Estimate card */}
        <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-8">

          {/* Number + total hero */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Estimate</p>
              <p className="text-2xl font-bold">{estimate.estimate_number}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(estimate.total, estimate.currency)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Prepared for + meta */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Prepared for</p>
              {client ? (
                <div className="space-y-0.5">
                  <p className="font-semibold">{client.name}</p>
                  {client.email         && <p className="text-sm text-muted-foreground">{client.email}</p>}
                  {client.address_line1 && <p className="text-sm text-muted-foreground">{client.address_line1}</p>}
                  {(client.city || client.country_code) && (
                    <p className="text-sm text-muted-foreground">
                      {[client.city, client.country_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div className="space-y-1.5 text-sm sm:text-right">
              <div><span className="text-muted-foreground">Estimate #: </span><span className="font-medium">{estimate.estimate_number}</span></div>
              <div><span className="text-muted-foreground">Issued: </span><span>{formatDate(estimate.issue_date)}</span></div>
              {estimate.expiry_date && (
                <div>
                  <span className="text-muted-foreground">Valid until: </span>
                  <span className="font-medium">{formatDate(estimate.expiry_date)}</span>
                </div>
              )}
              <div><span className="text-muted-foreground">Currency: </span><span>{estimate.currency}</span></div>
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div>
            <div className="hidden sm:grid grid-cols-[1fr_80px_120px_100px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">
              <span>Description</span><span>Qty</span><span>Unit price</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="py-3 grid grid-cols-1 gap-1 sm:grid-cols-[1fr_80px_120px_100px] sm:gap-2 sm:items-center">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-muted-foreground sm:text-foreground">
                    <span className="sm:hidden text-muted-foreground">Qty: </span>{item.quantity}
                  </p>
                  <p className="text-sm text-muted-foreground sm:text-foreground">
                    <span className="sm:hidden text-muted-foreground">Unit: </span>
                    {formatCurrency(item.unit_price, estimate.currency)}
                  </p>
                  <p className="font-semibold sm:text-right">
                    {formatCurrency(item.total, estimate.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(estimate.subtotal, estimate.currency)}</span>
            </div>
            {estimate.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>−{formatCurrency(estimate.discount_amount, estimate.currency)}</span>
              </div>
            )}
            {estimate.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({estimate.tax_rate}%)</span>
                <span>{formatCurrency(estimate.tax_amount, estimate.currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(estimate.total, estimate.currency)}</span>
            </div>
          </div>

          {/* Notes + Terms */}
          {(estimate.notes || estimate.terms) && (
            <>
              <Separator />
              <div className="grid gap-6 sm:grid-cols-2">
                {estimate.notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{estimate.notes}</p>
                  </div>
                )}
                {estimate.terms && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Terms &amp; Conditions</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{estimate.terms}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Accept / Decline */}
          {canRespond && (
            <>
              <Separator />
              <div>
                <p className="mb-3 text-sm font-medium">Ready to respond?</p>
                <EstimateRespondForm token={token} />
              </div>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Sent by <strong>{org?.name ?? 'your vendor'}</strong> via BillCraft AI
        </p>
      </div>
    </div>
  )
}
