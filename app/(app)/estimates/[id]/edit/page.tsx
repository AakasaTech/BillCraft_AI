import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EstimateEditor } from '@/components/estimates/estimate-editor'
import type { Estimate, EstimateItem } from '@/types/database'

export const metadata = { title: 'Edit Estimate — BillCraft AI' }

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: estimateRaw }, { data: itemsRaw }, { data: clientsRaw }, { data: org }, { data: productsRaw }] =
    await Promise.all([
      supabase
        .from('estimates')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .eq('status', 'draft')
        .is('deleted_at', null)
        .single(),
      supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', id)
        .order('sort_order'),
      supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('organizations')
        .select('default_currency')
        .eq('id', orgId)
        .single(),
      supabase
        .from('products')
        .select('id, name, description, unit_price, currency')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name'),
    ])

  if (!estimateRaw) notFound()

  const estimate = estimateRaw as Estimate
  const items    = (itemsRaw ?? []) as EstimateItem[]

  const clients  = (clientsRaw  ?? []).map(c => ({ id: c.id, name: c.name }))
  const products = (productsRaw ?? []).map(p => ({
    id: p.id, name: p.name, description: p.description,
    unit_price: p.unit_price, currency: p.currency,
  }))

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Estimate</h1>
        <p className="text-sm text-muted-foreground">{estimate.estimate_number}</p>
      </div>
      <EstimateEditor
        estimateId={id}
        clients={clients}
        defaultCurrency={org?.default_currency ?? estimate.currency}
        products={products}
        defaultValues={{
          client_id:       estimate.client_id,
          estimate_number: estimate.estimate_number,
          issue_date:      estimate.issue_date,
          expiry_date:     estimate.expiry_date ?? '',
          currency:        estimate.currency,
          tax_type:        estimate.tax_type,
          tax_rate:        estimate.tax_rate,
          discount_amount: estimate.discount_amount,
          notes:           estimate.notes ?? '',
          terms:           estimate.terms ?? '',
          items: items.map(i => ({
            description: i.description,
            quantity:    i.quantity,
            unit_price:  i.unit_price,
            sort_order:  i.sort_order,
          })),
        }}
      />
    </div>
  )
}
