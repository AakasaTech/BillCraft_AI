import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ClientsTable } from '@/components/clients/clients-table'

export const metadata: Metadata = { title: 'Clients — BillCraft AI' }

export default async function ClientsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userRecord } = await supabase
    .from('users')
    .select('*')
    .eq('id', user!.id)
    .single()

  const orgId = userRecord?.organization_id!

  // Fetch clients with invoice count via foreign table aggregate
  const { data: rawResult } = await supabase
    .from('clients')
    .select('id, name, email, phone, country_code, preferred_currency, address_line1, address_line2, city, state, postal_code, tax_registration_number, notes, cc_emails, created_at, invoices(count)')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  type ClientWithCount = { id: string; name: string; email: string | null; phone: string | null; country_code: string | null; preferred_currency: string | null; address_line1: string | null; address_line2: string | null; city: string | null; state: string | null; postal_code: string | null; tax_registration_number: string | null; notes: string | null; cc_emails: string[] | null; created_at: string; invoices: { count: number }[] }
  const raw = rawResult as ClientWithCount[] | null

  const clients = (raw ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    country_code: c.country_code,
    preferred_currency: c.preferred_currency,
    address_line1: c.address_line1,
    address_line2: c.address_line2,
    city: c.city,
    state: c.state,
    postal_code: c.postal_code,
    tax_registration_number: c.tax_registration_number,
    notes: c.notes,
    cc_emails: c.cc_emails ?? [],
    created_at: c.created_at,
    invoiceCount: c.invoices[0]?.count ?? 0,
  }))

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground">
          {clients.length} client{clients.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ClientsTable clients={clients} />
    </div>
  )
}
