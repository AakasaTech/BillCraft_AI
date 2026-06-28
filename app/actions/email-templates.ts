'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPlanStatus } from '@/lib/subscription'
import type { EmailTemplateType } from '@/types/database'

const schema = z.object({
  type:    z.enum(['invoice', 'reminder', 'estimate']),
  subject: z.string().min(1, 'Subject is required').max(500),
  body:    z.string().min(1, 'Body is required').max(5000),
})

type ActionResult = { error?: string; success?: boolean }

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  if (!data?.organization_id) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

export async function upsertEmailTemplateAction(raw: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const plan = await getPlanStatus(ctx.orgId, ctx.supabase)
  if (!plan.canUseTemplates) return { error: 'Custom email templates require a Pro or Agency plan.' }

  const { type, subject, body } = parsed.data

  const { error } = await ctx.supabase
    .from('email_templates')
    .upsert(
      { organization_id: ctx.orgId, type, subject, body, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,type' },
    )

  if (error) return { error: error.message }

  revalidatePath('/settings/email-templates')
  return { success: true }
}

export async function resetEmailTemplateAction(type: EmailTemplateType): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('email_templates')
    .delete()
    .eq('organization_id', ctx.orgId)
    .eq('type', type)

  if (error) return { error: error.message }

  revalidatePath('/settings/email-templates')
  return { success: true }
}
