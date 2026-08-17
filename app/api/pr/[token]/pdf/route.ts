import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import type { Proforma, ProformaItem, Client, ClientSubunit, Organization } from '@/types/database'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const supabase  = createServiceClient()

  const { data: proformaRaw } = await supabase
    .from('proformas')
    .select('*, clients(*)')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (!proformaRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const proforma = proformaRaw as Proforma & { clients: Client | null }
  const client   = proforma.clients

  const [{ data: orgRaw }, { data: itemsRaw }, { data: subunitRaw }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', proforma.organization_id).single(),
    supabase.from('proforma_items').select('*').eq('proforma_id', proforma.id).order('sort_order'),
    proforma.client_subunit_id
      ? supabase.from('client_subunits').select('*').eq('id', proforma.client_subunit_id).single()
      : Promise.resolve({ data: null }),
  ])

  if (!orgRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { ProformaPDF }    = await import('@/lib/pdf/proforma-pdf')

  const buffer = await renderToBuffer(
    createElement(ProformaPDF, {
      proforma,
      items: (itemsRaw ?? []) as ProformaItem[],
      client,
      clientSubunit: subunitRaw as ClientSubunit | null,
      org: orgRaw as Organization,
    }) as any,
  )

  const filename = `proforma-${proforma.proforma_number}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
