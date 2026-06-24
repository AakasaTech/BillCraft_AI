'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  registerSchema,
  type LoginFormData,
  type RegisterFormData,
} from '@/lib/validations/auth'

export type ActionState = {
  error?: string
  success?: string
}

export async function loginAction(data: LoginFormData, next?: string): Promise<ActionState> {
  const parsed = loginSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Return a generic message to avoid user enumeration
    return { error: 'Invalid email or password.' }
  }

  // Check if user has completed onboarding
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!userRecord?.organization_id) {
      // If user has no org but there's a next URL (e.g. invite), skip onboard redirect
      if (next && next.startsWith('/')) redirect(next)
      redirect('/onboard')
    }
  }

  if (next && next.startsWith('/')) redirect(next)
  redirect('/dashboard')
}

export async function registerAction(data: RegisterFormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()

  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  const { data: authData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists. Try signing in.' }
    }
    return { error: error.message }
  }

  // Email confirmation required — session is null until user clicks the link
  if (!authData.session) {
    return {
      success: `We sent a verification link to ${parsed.data.email}. Check your inbox and click the link to continue.`,
    }
  }

  // Email confirmation disabled (local dev) — user has a session immediately
  redirect('/onboard')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signInWithGoogleAction(): Promise<ActionState> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // data.url is the Google OAuth consent URL — redirect the browser there
  if (data.url) {
    redirect(data.url)
  }

  return { error: 'Failed to start Google sign-in.' }
}
