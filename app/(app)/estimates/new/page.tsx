import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EstimateEditor } from '@/components/estimates/estimate-editor'

export const metadata = { title: 'New Estimate — BillCraft AI' }

export default async function NewEstimatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: clientsRaw }, { data: org }, { data: nextNum }, { data: productsRaw }] = await Promise.all([
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
    supabase.rpc('peek_estimate_number', { p_org_id: orgId }),
    supabase
      .from('products')
      .select('id, name, description, unit_price, currency')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name'),
  ])

  const clients  = (clientsRaw  ?? []).map(c => ({ id: c.id, name: c.name }))
  const products = (productsRaw ?? []).map(p => ({
    id: p.id, name: p.name, description: p.description,
    unit_price: p.unit_price, currency: p.currency,
  }))

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Estimate</h1>
        <p className="text-sm text-muted-foreground">
          Create a quote for a client. They can accept or decline via a shared link.
        </p>
      </div>
      <EstimateEditor
        clients={clients}
        defaultCurrency={org?.default_currency ?? 'USD'}
        nextEstimateNumber={nextNum ?? 'EST-2024-0001'}
        products={products}
      />
    </div>
  )
}
