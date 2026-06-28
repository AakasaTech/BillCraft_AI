'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendInvoiceEmailAction } from './send-invoice'

const VOIDABLE = ['sent', 'viewed', 'partial', 'overdue']

export type BulkSendResult = { sent: number; skipped: number; failed: number }
export type BulkVoidResult = { voided: number; error?: string }

export async function bulkSendAction(ids: string[]): Promise<BulkSendResult> {
  if (!ids.length) return { sent: 0, skipped: 0, failed: 0 }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { sent: 0, skipped: 0, failed: ids.length }

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return { sent: 0, skipped: 0, failed: ids.length }

  // Fetch invoice statuses + client emails to skip unsendable ones upfront
  const { data: rows } = await supabase
    .from('invoices')
    .select('id, status, clients(email)')
    .in('id', ids)
    .eq('organization_id', userRecord.organization_id)
    .is('deleted_at', null)

  const sendable = (rows ?? []).filter(r => {
    const sendableStatuses = ['draft', 'sent', 'viewed', 'overdue', 'partial']
    const clientEmail = (r.clients as unknown as { email: string | null } | null)?.email
    return sendableStatuses.includes(r.status) && !!clientEmail
  })

  const skipped = ids.length - sendable.length
  let sent = 0
  let failed = 0

  for (const row of sendable) {
    const result = await sendInvoiceEmailAction(row.id)
    if (result?.error) failed++
    else sent++
  }

  revalidatePath('/invoices')
  return { sent, skipped, failed }
}

export async function bulkVoidAction(ids: string[]): Promise<BulkVoidResult> {
  if (!ids.length) return { voided: 0 }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { voided: 0, error: 'Not authenticated' }

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return { voided: 0, error: 'Organization not found' }

  const { error, count } = await supabase
    .from('invoices')
    .update({ status: 'void' })
    .in('id', ids)
    .eq('organization_id', userRecord.organization_id)
    .in('status', VOIDABLE)

  if (error) return { voided: 0, error: error.message }

  revalidatePath('/invoices')
  return { voided: count ?? 0 }
}
