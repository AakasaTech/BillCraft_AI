import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceItem, Client, ClientSubunit, Organization } from '@/types/database'

export const metadata = {
  title: 'Invoice',
  robots: 'noindex, nofollow',
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase  = createServiceClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*)')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (!invoice) notFound()

  // Fetch org and items in parallel
  const [{ data: orgRaw }, { data: itemsRaw }, { data: subunitRaw }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', invoice.organization_id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id).order('sort_order'),
    invoice.client_subunit_id
      ? supabase.from('client_subunits').select('*').eq('id', invoice.client_subunit_id).single()
      : Promise.resolve({ data: null }),
  ])

  // Mark as viewed on first open (only transitions from 'sent' → 'viewed')
  if (invoice.status === 'sent') {
    await supabase
      .from('invoices')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', invoice.id)
  }

  const inv           = invoice as Invoice & { clients: Client | null }
  const client        = inv.clients
  const clientSubunit = subunitRaw as ClientSubunit | null
  const org           = orgRaw as Organization | null
  const items         = (itemsRaw ?? []) as InvoiceItem[]

  const isPaid = inv.status === 'paid'

  const billToAddr1   = clientSubunit?.address_line1 ?? client?.address_line1
  const billToAddr2   = clientSubunit?.address_line2 ?? client?.address_line2
  const billToCity    = clientSubunit?.city           ?? client?.city
  const billToCountry = clientSubunit?.country_code   ?? client?.country_code

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-3xl">

        {/* Top bar: org branding + download */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {org?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-10 w-auto max-w-[120px] object-contain"
              />
            )}
            <div>
              {org && <p className="text-lg font-bold">{org.name}</p>}
              {org?.address_line1 && (
                <p className="text-xs text-muted-foreground">{org.address_line1}</p>
              )}
            </div>
          </div>
          <a
            href={`/api/p/${token}/pdf`}
            download
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </a>
        </div>

        {/* Invoice card */}
        <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-8">

          {/* Invoice number + amount due hero */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Invoice</p>
              <p className="text-2xl font-bold">{inv.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                {isPaid ? 'Amount paid' : 'Amount due'}
              </p>
              <p className={`text-2xl font-bold ${isPaid ? 'text-green-600' : 'text-primary'}`}>
                {formatCurrency(isPaid ? inv.amount_paid : inv.amount_due, inv.currency)}
              </p>
              {isPaid && (
                <p className="mt-1 text-xs font-medium text-green-600 uppercase tracking-wide">Paid</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Billed to + meta */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Billed to</p>
              {client ? (
                <div className="space-y-0.5">
                  <p className="font-semibold">{client.name}</p>
                  {clientSubunit?.name && <p className="text-sm text-muted-foreground">Attn: {clientSubunit.name}</p>}
                  {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                  {billToAddr1  && <p className="text-sm text-muted-foreground">{billToAddr1}</p>}
                  {billToAddr2  && <p className="text-sm text-muted-foreground">{billToAddr2}</p>}
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
              <div><span className="text-muted-foreground">Invoice #: </span><span className="font-medium">{inv.invoice_number}</span></div>
              <div><span className="text-muted-foreground">Issued: </span><span>{formatDate(inv.issue_date)}</span></div>
              {inv.due_date && (
                <div>
                  <span className="text-muted-foreground">Due: </span>
                  <span className="font-medium">{formatDate(inv.due_date)}</span>
                </div>
              )}
              <div><span className="text-muted-foreground">Currency: </span><span>{inv.currency}</span></div>
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
                    {formatCurrency(item.unit_price, inv.currency)}
                  </p>
                  <p className="font-semibold sm:text-right">
                    {formatCurrency(item.total, inv.currency)}
                  </p>
                </div>
              ))}
              {inv.local_transport_amount > 0 && (
                <div className="py-3 grid grid-cols-1 gap-1 sm:grid-cols-[1fr_80px_120px_100px] sm:gap-2 sm:items-center">
                  <p className="font-medium">Local Transport</p>
                  <p className="text-sm text-muted-foreground sm:text-foreground">
                    <span className="sm:hidden text-muted-foreground">Qty: </span>1
                  </p>
                  <p className="text-sm text-muted-foreground sm:text-foreground">
                    <span className="sm:hidden text-muted-foreground">Unit: </span>
                    {formatCurrency(inv.local_transport_amount, inv.currency)}
                  </p>
                  <p className="font-semibold sm:text-right">
                    {formatCurrency(inv.local_transport_amount, inv.currency)}
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
              <span>{formatCurrency(inv.subtotal, inv.currency)}</span>
            </div>
            {inv.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>−{formatCurrency(inv.discount_amount, inv.currency)}</span>
              </div>
            )}
            {inv.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({inv.tax_rate}%)</span>
                <span>{formatCurrency(inv.tax_amount, inv.currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(inv.total, inv.currency)}</span>
            </div>
            {inv.amount_paid > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Amount paid</span>
                  <span>−{formatCurrency(inv.amount_paid, inv.currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>Amount due</span>
                  <span>{formatCurrency(inv.amount_due, inv.currency)}</span>
                </div>
              </>
            )}
          </div>

          {/* Payment instructions + Notes */}
          {(inv.payment_instructions || inv.notes) && (
            <>
              <Separator />
              <div className="grid gap-6 sm:grid-cols-2">
                {inv.payment_instructions && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Payment instructions</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{inv.payment_instructions}</p>
                  </div>
                )}
                {inv.notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{inv.notes}</p>
                  </div>
                )}
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
