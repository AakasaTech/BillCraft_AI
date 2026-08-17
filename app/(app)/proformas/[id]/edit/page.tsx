import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProformaEditor } from '@/components/proformas/proforma-editor'
import type { Proforma, ProformaItem } from '@/types/database'

export const metadata = { title: 'Edit Proforma — BillCraft AI' }

export default async function EditProformaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: proformaRaw }, { data: itemsRaw }, { data: clientsRaw }, { data: org }, { data: productsRaw }, { data: subunitsRaw }] =
    await Promise.all([
      supabase
        .from('proformas')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .eq('status', 'draft')
        .is('deleted_at', null)
        .single(),
      supabase
        .from('proforma_items')
        .select('*')
        .eq('proforma_id', id)
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

  if (org?.category !== 'trading') redirect('/dashboard')
  if (!proformaRaw) notFound()

  const proforma = proformaRaw as Proforma
  const items    = (itemsRaw ?? []) as ProformaItem[]

  const clients  = (clientsRaw  ?? []).map(c => ({ id: c.id, name: c.name }))
  const products = (productsRaw ?? []).map(p => ({
    id: p.id, name: p.name, description: p.description,
    unit_price: p.unit_price, currency: p.currency,
  }))
  const subunits = (subunitsRaw ?? []) as { id: string; client_id: string; name: string }[]

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Proforma</h1>
        <p className="text-sm text-muted-foreground">{proforma.proforma_number}</p>
      </div>
      <ProformaEditor
        proformaId={id}
        clients={clients}
        defaultCurrency={org?.default_currency ?? proforma.currency}
        products={products}
        subunits={subunits}
        defaultValues={{
          client_id:              proforma.client_id,
          client_subunit_id:      proforma.client_subunit_id ?? '',
          proforma_number:        proforma.proforma_number,
          issue_date:              proforma.issue_date,
          expiry_date:             proforma.expiry_date ?? '',
          currency:                proforma.currency,
          tax_type:                proforma.tax_type,
          tax_rate:                proforma.tax_rate,
          discount_amount:         proforma.discount_amount,
          shipping_terms:          proforma.shipping_terms ?? '',
          local_transport_amount: proforma.local_transport_amount,
          notes:                   proforma.notes ?? '',
          terms:                   proforma.terms ?? '',
          items: items.map(i => ({
            description:       i.description,
            quantity:          i.quantity,
            unit_price:        i.unit_price,
            hs_code:           i.hs_code ?? '',
            country_of_origin: i.country_of_origin ?? '',
            sort_order:        i.sort_order,
          })),
        }}
      />
    </div>
  )
}
