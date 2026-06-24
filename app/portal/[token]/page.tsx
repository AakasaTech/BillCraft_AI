import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPortalSession, SESSION_COOKIE } from '@/lib/portal-session'
import { PortalLogin } from '@/components/portal/portal-login'
import { PortalStatementDownload } from '@/components/portal/portal-statement-download'
import { Separator } from '@/components/ui/separator'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Client, Organization, Invoice, InvoiceStatus } from '@/types/database'

export const metadata = {
  title: 'Client Portal',
  robots: 'noindex, nofollow',
}

const VISIBLE_STATUSES: InvoiceStatus[] = ['sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'void']

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase  = createServiceClient()

  const { data: clientRaw } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_token', token)
    .is('deleted_at', null)
    .single()

  if (!clientRaw) notFound()

  const client = clientRaw as Client

  const { data: orgRaw } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', client.organization_id)
    .single()

  if (!orgRaw) notFound()
  const org = orgRaw as Organization

  // ── Auth gate ────────────────────────────────────────────────────────────────
  const cookieStore    = await cookies()
  const sessionCookie  = cookieStore.get(SESSION_COOKIE)?.value
  const sessionClientId = sessionCookie ? verifyPortalSession(sessionCookie) : null

  if (sessionClientId !== client.id) {
    return (
      <PortalLogin
        token={token}
        orgName={org.name}
        logoUrl={org.logo_url}
      />
    )
  }

  // ── Authenticated — load portal data ─────────────────────────────────────────
  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total, currency, issue_date, due_date, amount_paid, amount_due, share_token')
    .eq('client_id', client.id)
    .eq('organization_id', client.organization_id)
    .in('status', VISIBLE_STATUSES)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const invoices = (invoicesRaw ?? []) as (Pick<Invoice,
    'id' | 'invoice_number' | 'status' | 'total' | 'currency' |
    'issue_date' | 'due_date' | 'amount_paid' | 'amount_due' | 'share_token'>)[]

  const displayCurrency = client.preferred_currency ?? invoices[0]?.currency ?? 'USD'
  const totalInvoiced   = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid       = invoices.reduce((s, i) => s + i.amount_paid, 0)
  const outstanding     = invoices.reduce((s, i) => s + i.amount_due, 0)

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {org.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-10 w-auto max-w-[120px] object-contain"
              />
            )}
            <div>
              <p className="text-lg font-bold">{org.name}</p>
              {org.address_line1 && (
                <p className="text-xs text-muted-foreground">{org.address_line1}</p>
              )}
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Client Portal
          </span>
        </div>

        {/* Client greeting */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="mt-0.5 text-2xl font-bold">{client.name}</h1>
          {client.email && (
            <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">Total invoiced</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(totalInvoiced, displayCurrency)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">Total paid</p>
            <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(totalPaid, displayCurrency)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="mt-1 text-xl font-bold text-orange-500">{formatCurrency(outstanding, displayCurrency)}</p>
          </div>
        </div>

        {/* Invoice list */}
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Invoices</h2>
            <p className="text-xs text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
          </div>

          {invoices.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No invoices yet. Your vendor will send you one shortly.
            </p>
          ) : (
            <div className="divide-y">
              {invoices.map((inv) => {
                const canView = !!inv.share_token
                return (
                  <div key={inv.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{inv.invoice_number}</span>
                        <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                        <span>Issued {formatDate(inv.issue_date)}</span>
                        {inv.due_date && <span>Due {formatDate(inv.due_date)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(inv.total, inv.currency)}</p>
                        {inv.amount_due > 0 && inv.status !== 'paid' && (
                          <p className="text-xs text-orange-500">
                            Due: {formatCurrency(inv.amount_due, inv.currency)}
                          </p>
                        )}
                      </div>
                      {canView && (
                        <div className="flex gap-2">
                          <a
                            href={`/p/${inv.share_token}`}
                            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                          >
                            View
                          </a>
                          <a
                            href={`/api/p/${inv.share_token}/pdf`}
                            download
                            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                          >
                            PDF
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {invoices.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <Separator className="mb-4" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total invoiced</span>
              <span className="font-medium">{formatCurrency(totalInvoiced, displayCurrency)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Total paid</span>
              <span className="font-medium text-green-600">{formatCurrency(totalPaid, displayCurrency)}</span>
            </div>
            <div className="mt-2 flex justify-between font-bold">
              <span>Outstanding</span>
              <span className="text-orange-500">{formatCurrency(outstanding, displayCurrency)}</span>
            </div>
          </div>
        )}

        {/* Statement download */}
        <PortalStatementDownload token={token} clientName={client.name} />

        <p className="text-center text-xs text-muted-foreground">
          Invoices from <strong>{org.name}</strong> via BillCraft AI
        </p>
      </div>
    </div>
  )
}
