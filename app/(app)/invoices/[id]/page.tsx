import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlanStatus } from '@/lib/subscription'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { InvoiceActions } from '@/components/invoices/invoice-actions'
import { InvoiceTimeline } from '@/components/invoices/invoice-timeline'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceItem, Client, EmailLog, Payment } from '@/types/database'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Invoice ${id.slice(0, 8)} — BillCraft AI` }
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [plan, [{ data: invoice }, { data: itemsRaw }, { data: emailsRaw }, { data: paymentsRaw }]] = await Promise.all([
    getPlanStatus(orgId, supabase),
    Promise.all([
    supabase
      .from('invoices')
      .select(`*, clients ( * )`)
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order'),
    supabase
      .from('email_logs')
      .select('*')
      .eq('invoice_id', id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .eq('organization_id', orgId)
      .order('payment_date', { ascending: false }),
  ]),
  ])

  if (!invoice) notFound()

  const inv      = invoice as Invoice & { clients: Client | null }
  const items    = (itemsRaw ?? []) as InvoiceItem[]
  const client   = inv.clients
  const emails   = (emailsRaw  ?? []) as EmailLog[]
  const payments = (paymentsRaw ?? []) as Payment[]

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{inv.invoice_number}</h1>
            <InvoiceStatusBadge status={inv.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Issued {formatDate(inv.issue_date)}
            {inv.due_date && <> · Due {formatDate(inv.due_date)}</>}
          </p>
        </div>
        <InvoiceActions
          invoiceId={inv.id}
          status={inv.status}
          clientEmail={client?.email ?? null}
          amountDue={inv.amount_due}
          currency={inv.currency}
          shareToken={inv.share_token}
          canUseAI={plan.canUseAI}
        />
      </div>

      {/* Invoice preview card */}
      <div className="rounded-xl border bg-card p-8 shadow-sm space-y-8 print:shadow-none print:border-none">

        {/* Client + Invoice meta */}
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Billed to</p>
            {client ? (
              <>
                <p className="font-semibold">{client.name}</p>
                {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                {client.address_line1 && <p className="text-sm text-muted-foreground">{client.address_line1}</p>}
                {(client.city || client.country_code) && (
                  <p className="text-sm text-muted-foreground">
                    {[client.city, client.country_code].filter(Boolean).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Client not found</p>
            )}
          </div>

          <div className="sm:text-right space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Invoice #: </span>
              <span className="font-medium">{inv.invoice_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Issued: </span>
              <span>{formatDate(inv.issue_date)}</span>
            </div>
            {inv.due_date && (
              <div>
                <span className="text-muted-foreground">Due: </span>
                <span>{formatDate(inv.due_date)}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Currency: </span>
              <span>{inv.currency}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Line items */}
        <div>
          <div className="hidden sm:grid grid-cols-[1fr_80px_120px_100px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
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
              <span className="text-muted-foreground">
                Tax ({inv.tax_rate}%)
              </span>
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
              <div className="flex justify-between text-[var(--success)]">
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

        {/* Notes */}
        {(inv.notes || inv.payment_instructions) && (
          <>
            <Separator />
            <div className="grid gap-6 sm:grid-cols-2">
              {inv.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{inv.notes}</p>
                </div>
              )}
              {inv.payment_instructions && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Payment instructions</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{inv.payment_instructions}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Activity timeline */}
      <div className="mt-8 rounded-xl border bg-card p-6">
        <InvoiceTimeline invoice={inv} emails={emails} payments={payments} />
      </div>
    </div>
  )
}
