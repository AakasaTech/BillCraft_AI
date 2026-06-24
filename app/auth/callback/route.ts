import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    const url = new URL('/login', origin)
    url.searchParams.set('error', errorDescription ?? 'Authentication failed')
    return NextResponse.redirect(url)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const url = new URL('/login', origin)
    url.searchParams.set('error', 'Could not verify your email. Please try again.')
    return NextResponse.redirect(url)
  }

  // Determine where to send the user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!userRecord?.organization_id) {
    return NextResponse.redirect(new URL('/onboard', origin))
  }

  return NextResponse.redirect(new URL(next, origin))
}
