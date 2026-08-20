'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildInvitationEmail } from '@/lib/email/invitation-template'
import { inviteSchema, type InviteFormData } from '@/lib/validations/team'
import { logAudit } from '@/lib/audit'

type ActionResult = { error?: string; success?: boolean }

// ── Invite a new team member ─────────────────────────────────────────────────

export async function inviteTeamMemberAction(data: InviteFormData): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return { error: 'Email sending is not configured.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: inviter } = await supabase
    .from('users').select('organization_id, role, name').eq('id', user.id).single()
  if (!inviter?.organization_id) return { error: 'No organization found' }
  if (!['owner', 'admin'].includes(inviter.role)) return { error: 'Only owners and admins can invite team members.' }

  const orgId = inviter.organization_id
  const { email, role } = parsed.data

  // Check email not already in org
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle()
  if (existing) return { error: 'This person is already a member of your team.' }

  // Check no active pending invitation
  const { data: pending } = await supabase
    .from('invitations')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', email)
    .is('deleted_at', null)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (pending) return { error: 'An invitation has already been sent to this email.' }

  // Create invitation
  const { data: invitation, error: insertErr } = await supabase
    .from('invitations')
    .insert({
      organization_id: orgId,
      email,
      role,
      invited_by: user.id,
    })
    .select('token')
    .single()
  if (insertErr || !invitation) return { error: 'Failed to create invitation.' }

  // Fetch org name for email
  const { data: org } = await supabase
    .from('organizations').select('name').eq('id', orgId).single()

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`
  const { subject, html, text } = buildInvitationEmail(
    email,
    org?.name ?? 'your team',
    inviter.name ?? user.email ?? 'Someone',
    role,
    acceptUrl,
  )

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendErr } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to:   email,
    subject,
    html,
    text,
  })
  if (sendErr) return { error: sendErr.message }

  logAudit(supabase, {
    orgId: orgId, userId: user.id, entityType: 'invitation', entityId: invitation.token,
    action: 'create', newValues: { email, role },
  })

  revalidatePath('/settings/team')
  return { success: true }
}

// ── Revoke a pending invitation ──────────────────────────────────────────────

export async function revokeInvitationAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: caller } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!['owner', 'admin'].includes(caller?.role ?? '')) return { error: 'Insufficient permissions.' }

  const { error } = await supabase
    .from('invitations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', caller!.organization_id!)

  if (error) return { error: error.message }

  revalidatePath('/settings/team')
  return { success: true }
}

// ── Accept an invitation ─────────────────────────────────────────────────────

export async function acceptInvitationAction(token: string): Promise<ActionResult> {
  const supabase      = await createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in to accept this invitation.' }

  const { data: invitation } = await serviceClient
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('deleted_at', null)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invitation) return { error: 'Invitation not found or has expired.' }

  if (invitation.email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
    return { error: `This invitation was sent to ${invitation.email}. Please sign in with that email address.` }
  }

  const now = new Date().toISOString()
  await Promise.all([
    serviceClient
      .from('invitations')
      .update({ accepted_at: now })
      .eq('id', invitation.id),
    serviceClient
      .from('users')
      .update({ organization_id: invitation.organization_id, role: invitation.role })
      .eq('id', user.id),
  ])

  redirect('/dashboard')
}

// ── Remove a team member ─────────────────────────────────────────────────────

export async function removeMemberAction(targetUserId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.id === targetUserId) return { error: 'You cannot remove yourself.' }

  const { data: caller } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (caller?.role !== 'owner') return { error: 'Only the owner can remove team members.' }

  // Fetch target to validate they're in the same org and not the owner
  const { data: target } = await supabase
    .from('users').select('role, organization_id').eq('id', targetUserId).single()
  if (!target || target.organization_id !== caller.organization_id) {
    return { error: 'Member not found.' }
  }
  if (target.role === 'owner') return { error: 'Cannot remove the owner.' }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('users')
    .update({ organization_id: null, role: 'member' })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  logAudit(supabase, {
    orgId: caller!.organization_id!, userId: user.id, entityType: 'member', entityId: targetUserId,
    action: 'delete', newValues: { removed_user_id: targetUserId },
  })

  revalidatePath('/settings/team')
  return { success: true }
}

// ── Designate / un-designate an invoice approver (Agency plan) ──────────────

export async function setInvoiceApproverAction(
  targetUserId: string,
  isApprover: boolean,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: caller } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!['owner', 'admin'].includes(caller?.role ?? '')) return { error: 'Insufficient permissions.' }

  const { data: target } = await supabase
    .from('users').select('organization_id').eq('id', targetUserId).single()
  if (!target || target.organization_id !== caller!.organization_id) {
    return { error: 'Member not found.' }
  }

  // The users table's UPDATE RLS only permits editing your own row
  // (users_update_own USING id = auth.uid()), so an owner/admin designating
  // another member as an approver must write through the service client.
  // Authorization is enforced above (role + same-org check) before RLS is bypassed.
  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('users')
    .update({ is_invoice_approver: isApprover })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  logAudit(supabase, {
    orgId: caller!.organization_id!, userId: user.id, entityType: 'member', entityId: targetUserId,
    action: 'update', newValues: { is_invoice_approver: isApprover },
  })

  revalidatePath('/settings/team')
  return { success: true }
}
