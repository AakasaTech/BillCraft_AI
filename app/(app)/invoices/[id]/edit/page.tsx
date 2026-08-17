import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoiceEditor } from '@/components/invoices/invoice-editor'
import type { InvoiceFormData } from '@/lib/validations/invoices'
import type { Invoice, InvoiceItem } from '@/types/database'

export const metadata = { title: 'Edit Invoice — BillCraft AI' }

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
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

  const [{ data: invoice }, { data: itemsRaw }, { data: clientsRaw }, { data: orgData }, { data: productsRaw }, { data: subunitsRaw }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*')
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
      .from('clients')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single(),
    supabase
      .from('products')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('client_subunits')
      .select('id, client_id, name')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('name'),
  ])

  if (!invoice || invoice.status !== 'draft') notFound()

  const inv   = invoice as Invoice
  const items = (itemsRaw ?? []) as InvoiceItem[]

  const defaultValues: InvoiceFormData = {
    client_id:            inv.client_id,
    invoice_number:       inv.invoice_number,
    issue_date:           inv.issue_date,
    due_date:             inv.due_date ?? '',
    currency:             inv.currency,
    tax_type:             inv.tax_type,
    tax_rate:             inv.tax_rate,
    discount_amount:      inv.discount_amount,
    notes:                inv.notes ?? '',
    payment_instructions: inv.payment_instructions ?? '',
    client_subunit_id:      inv.client_subunit_id ?? '',
    shipping_terms:         inv.shipping_terms ?? '',
    local_transport_amount: inv.local_transport_amount ?? 0,
    is_simplified:          inv.is_simplified ?? false,
    items: items.map((item, i) => ({
      description: item.description,
      quantity:    item.quantity,
      unit_price:  item.unit_price,
      sort_order:  i,
    })),
  }

  const isTrading = orgData?.category === 'trading'
  const clients  = (clientsRaw  ?? []).map(c => ({ id: c.id, name: c.name }))
  const products = (productsRaw ?? []).map(p => ({
    id: p.id, name: p.name, description: p.description,
    unit_price: p.unit_price, currency: p.currency,
  }))
  const subunits = (subunitsRaw ?? []) as { id: string; client_id: string; name: string }[]

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Invoice</h1>
        <p className="text-sm text-muted-foreground">{inv.invoice_number}</p>
      </div>
      <InvoiceEditor
        clients={clients}
        defaultCurrency={orgData?.default_currency ?? inv.currency}
        nextInvoiceNumber={inv.invoice_number}
        invoiceId={inv.id}
        defaultValues={defaultValues}
        savedPaymentInstructions={(orgData?.payment_instructions ?? []) as { name: string; content: string }[]}
        products={products}
        isTrading={isTrading}
        subunits={subunits}
      />
    </div>
  )
}
