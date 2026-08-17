import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { ProformaRespondForm } from '@/components/proformas/proforma-respond-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Proforma, ProformaItem, Client, ClientSubunit, Organization, ProformaStatus } from '@/types/database'

export const metadata = {
  title: 'Proforma Invoice',
  robots: 'noindex, nofollow',
}

const STATUS_LABEL: Record<ProformaStatus, string> = {
  draft:     'Draft',
  sent:      'Pending your response',
  viewed:    'Pending your response',
  accepted:  'Accepted',
  converted: 'Accepted',
  expired:   'Expired',
}

const STATUS_STYLE: Record<ProformaStatus, string> = {
  draft:     'bg-muted text-muted-foreground',
  sent:      'bg-amber-100 text-amber-700',
  viewed:    'bg-amber-100 text-amber-700',
  accepted:  'bg-green-100 text-green-700',
  converted: 'bg-green-100 text-green-700',
  expired:   'bg-muted text-muted-foreground',
}

export default async function PublicProformaPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase  = createServiceClient()

  const { data: proformaRaw } = await supabase
    .from('proformas')
    .select('*, clients(*)')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (!proformaRaw) notFound()

  const [{ data: orgRaw }, { data: itemsRaw }, { data: subunitRaw }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', proformaRaw.organization_id).single(),
    supabase.from('proforma_items').select('*').eq('proforma_id', proformaRaw.id).order('sort_order'),
    proformaRaw.client_subunit_id
      ? supabase.from('client_subunits').select('*').eq('id', proformaRaw.client_subunit_id).single()
      : Promise.resolve({ data: null }),
  ])

  // Mark as viewed on first open (sent → viewed)
  if (proformaRaw.status === 'sent') {
    await supabase
      .from('proformas')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', proformaRaw.id)
  }

  const proforma      = proformaRaw as Proforma & { clients: Client | null }
  const client        = proforma.clients
  const clientSubunit = subunitRaw as ClientSubunit | null
  const org           = orgRaw as Organization | null
  const items         = (itemsRaw ?? []) as ProformaItem[]
  const status         = proforma.status as ProformaStatus

  const canRespond = status === 'sent' || status === 'viewed'

  const billToAddr1   = clientSubunit?.address_line1 ?? client?.address_line1
  const billToCity    = clientSubunit?.city           ?? client?.city
  const billToCountry = clientSubunit?.country_code   ?? client?.country_code

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
            href={`/api/pr/${token}/pdf`}
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
        {(status === 'accepted' || status === 'converted') && (
          <div className="mb-4 rounded-xl p-4 text-sm font-medium bg-green-50 text-green-700 border border-green-200">
            You accepted this proforma invoice. {org?.name ?? 'The vendor'} will follow up with a commercial invoice shortly.
          </div>
        )}

        {status === 'expired' && (
          <div className="mb-4 rounded-xl border bg-muted/50 p-4 text-sm text-muted-foreground">
            This proforma has expired. Please contact {org?.name ?? 'the vendor'} for an updated quote.
          </div>
        )}

        {/* Proforma card */}
        <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-8">

          {/* Number + total hero */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Proforma Invoice</p>
              <p className="text-2xl font-bold">{proforma.proforma_number}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold text-teal-600">
                {formatCurrency(proforma.total, proforma.currency)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Bill to + meta */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Bill to</p>
              {client ? (
                <div className="space-y-0.5">
                  <p className="font-semibold">{client.name}</p>
                  {clientSubunit?.name && <p className="text-sm text-muted-foreground">Attn: {clientSubunit.name}</p>}
                  {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                  {billToAddr1 && <p className="text-sm text-muted-foreground">{billToAddr1}</p>}
                  {(billToCity || billToCountry) && (
                    <p className="text-sm text-muted-foreground">
                      {[billToCity, billToCountry].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div className="space-y-1.5 text-sm sm:text-right">
              <div><span className="text-muted-foreground">Proforma #: </span><span className="font-medium">{proforma.proforma_number}</span></div>
              <div><span className="text-muted-foreground">Issued: </span><span>{formatDate(proforma.issue_date)}</span></div>
              {proforma.expiry_date && (
                <div>
                  <span className="text-muted-foreground">Valid until: </span>
                  <span className="font-medium">{formatDate(proforma.expiry_date)}</span>
                </div>
              )}
              <div><span className="text-muted-foreground">Currency: </span><span>{proforma.currency}</span></div>
              {proforma.shipping_terms && (
                <div><span className="text-muted-foreground">Shipping terms: </span><span>{proforma.shipping_terms}</span></div>
              )}
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
                    {formatCurrency(item.unit_price, proforma.currency)}
                  </p>
                  <p className="font-semibold sm:text-right">
                    {formatCurrency(item.total, proforma.currency)}
                  </p>
                </div>
              ))}
              {proforma.local_transport_amount > 0 && (
                <div className="py-3 grid grid-cols-1 gap-1 sm:grid-cols-[1fr_80px_120px_100px] sm:gap-2 sm:items-center">
                  <p className="font-medium">Local Transport</p>
                  <p className="text-sm text-muted-foreground sm:text-foreground">
                    <span className="sm:hidden text-muted-foreground">Qty: </span>1
                  </p>
                  <p className="text-sm text-muted-foreground sm:text-foreground">
                    <span className="sm:hidden text-muted-foreground">Unit: </span>
                    {formatCurrency(proforma.local_transport_amount, proforma.currency)}
                  </p>
                  <p className="font-semibold sm:text-right">
                    {formatCurrency(proforma.local_transport_amount, proforma.currency)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(proforma.subtotal, proforma.currency)}</span>
            </div>
            {proforma.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>−{formatCurrency(proforma.discount_amount, proforma.currency)}</span>
              </div>
            )}
            {proforma.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({proforma.tax_rate}%)</span>
                <span>{formatCurrency(proforma.tax_amount, proforma.currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(proforma.total, proforma.currency)}</span>
            </div>
          </div>

          {/* Notes + Terms */}
          {(proforma.notes || proforma.terms) && (
            <>
              <Separator />
              <div className="grid gap-6 sm:grid-cols-2">
                {proforma.notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{proforma.notes}</p>
                  </div>
                )}
                {proforma.terms && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Terms &amp; Conditions</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{proforma.terms}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Accept */}
          {canRespond && (
            <>
              <Separator />
              <div>
                <p className="mb-3 text-sm font-medium">Ready to accept?</p>
                <ProformaRespondForm token={token} />
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
