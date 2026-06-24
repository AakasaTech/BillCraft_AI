import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductsTable } from '@/components/products/products-table'
import type { Product } from '@/types/database'

export const metadata = { title: 'Products — BillCraft AI' }

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: productsRaw }, { data: org }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('organizations')
      .select('default_currency')
      .eq('id', orgId)
      .single(),
  ])

  const products = (productsRaw ?? []) as Product[]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Products & Services</h1>
        <p className="text-sm text-muted-foreground">
          Save your products and services to quickly add them to invoices.
        </p>
      </div>
      <ProductsTable
        products={products}
        defaultCurrency={org?.default_currency ?? 'USD'}
      />
    </div>
  )
}
