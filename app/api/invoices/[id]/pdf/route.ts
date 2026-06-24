import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Invoice, InvoiceItem, Client, Organization } from '@/types/database'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const [{ data: invoice }, { data: itemsRaw }, { data: org }] = await Promise.all([
    supabase
      .from('invoices').select('*, clients(*)').eq('id', id)
      .eq('organization_id', userRecord.organization_id).is('deleted_at', null).single(),
    supabase
      .from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase
      .from('organizations').select('*').eq('id', userRecord.organization_id).single(),
  ])

  if (!invoice || !org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Dynamic import keeps @react-pdf/renderer out of the module graph for non-PDF requests
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { InvoicePDF }     = await import('@/lib/pdf/invoice-pdf')

  const inv    = invoice as Invoice & { clients: Client | null }
  const items  = (itemsRaw ?? []) as InvoiceItem[]
  const client = inv.clients

  const buffer = await renderToBuffer(
    createElement(InvoicePDF, { invoice: inv, items, client, org: org as Organization }),
  )

  return new Response(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${inv.invoice_number}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
