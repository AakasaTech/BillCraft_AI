import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import type { Estimate, EstimateItem, Client, Organization } from '@/types/database'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const supabase  = createServiceClient()

  const { data: estimateRaw } = await supabase
    .from('estimates')
    .select('*, clients(*)')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (!estimateRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const estimate = estimateRaw as Estimate & { clients: Client | null }
  const client   = estimate.clients

  const [{ data: orgRaw }, { data: itemsRaw }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', estimate.organization_id).single(),
    supabase.from('estimate_items').select('*').eq('estimate_id', estimate.id).order('sort_order'),
  ])

  if (!orgRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { EstimatePDF }    = await import('@/lib/pdf/estimate-pdf')

  const buffer = await renderToBuffer(
    createElement(EstimatePDF, {
      estimate,
      items: (itemsRaw ?? []) as EstimateItem[],
      client,
      org: orgRaw as Organization,
    }) as any,
  )

  const filename = `estimate-${estimate.estimate_number}.pdf`

  return new Response(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
