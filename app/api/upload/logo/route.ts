import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

async function getAuthOrgId(): Promise<{ orgId: string } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id)
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  if (!['owner', 'admin'].includes(userRecord.role))
    return NextResponse.json({ error: 'Only owners and admins can manage the logo' }, { status: 403 })

  return { orgId: userRecord.organization_id }
}

export async function POST(req: Request) {
  const result = await getAuthOrgId()
  if (result instanceof NextResponse) return result
  const { orgId } = result

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED.includes(file.type))
    return NextResponse.json({ error: 'File must be an image (JPEG, PNG, WebP, GIF, SVG)' }, { status: 400 })
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })

  const ext    = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path   = `${orgId}/logo.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const service = createServiceClient()
  const { error: uploadError } = await service.storage
    .from('logos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('logos').getPublicUrl(path)

  const { error: dbError } = await service
    .from('organizations')
    .update({ logo_url: publicUrl })
    .eq('id', orgId)

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE() {
  const result = await getAuthOrgId()
  if (result instanceof NextResponse) return result
  const { orgId } = result

  const service = createServiceClient()

  // Remove all files under the org's logo folder
  const { data: files } = await service.storage.from('logos').list(orgId)
  if (files && files.length > 0) {
    const paths = files.map((f) => `${orgId}/${f.name}`)
    await service.storage.from('logos').remove(paths)
  }

  await service.from('organizations').update({ logo_url: null }).eq('id', orgId)
  return NextResponse.json({ ok: true })
}
