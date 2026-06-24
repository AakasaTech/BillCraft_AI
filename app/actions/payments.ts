'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  amount:         z.number().positive('Amount must be greater than zero'),
  payment_method: z.enum(['bank_transfer', 'card', 'cash', 'check', 'paypal', 'crypto', 'other']),
  payment_date:   z.string().min(1, 'Payment date is required'),
  reference:      z.string().max(255).optional().or(z.literal('')),
  notes:          z.string().max(1000).optional().or(z.literal('')),
})

export type RecordPaymentInput = z.infer<typeof schema>
type ActionResult = { error?: string }

export async function recordPaymentAction(
  invoiceId: string,
  data: RecordPaymentInput,
): Promise<ActionResult> {
  const parsed = schema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return { error: 'Not authenticated' }

  const orgId = userRecord.organization_id

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, client_id, currency, total, amount_paid, status')
    .eq('id', invoiceId)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .single()

  if (!inv)                                         return { error: 'Invoice not found' }
  if (inv.status === 'paid')                        return { error: 'Invoice is already fully paid' }
  if (['void', 'cancelled'].includes(inv.status))   return { error: 'Cannot record payment for a void or cancelled invoice' }

  const prevPaid   = Number(inv.amount_paid)
  const invTotal   = Number(inv.total)
  const newPaid    = prevPaid + parsed.data.amount
  const remaining  = invTotal - newPaid

  if (parsed.data.amount > invTotal - prevPaid + 0.001) {
    return {
      error: `Payment of ${parsed.data.amount} exceeds the remaining balance of ${(invTotal - prevPaid).toFixed(2)}`,
    }
  }

  // Insert into payments table (audit trail)
  const { error: payErr } = await supabase.from('payments').insert({
    organization_id: orgId,
    invoice_id:      invoiceId,
    client_id:       inv.client_id,
    created_by:      user.id,
    amount:          parsed.data.amount,
    currency:        inv.currency,
    exchange_rate:   1,
    payment_method:  parsed.data.payment_method,
    payment_date:    parsed.data.payment_date,
    reference:       parsed.data.reference || null,
    notes:           parsed.data.notes || null,
    status:          'completed',
    gateway:         'manual',
  })

  if (payErr) return { error: payErr.message }

  // Update invoice status and amount_paid
  const newStatus = remaining <= 0.001 ? 'paid' : 'partial'
  const updates: Record<string, unknown> = { amount_paid: newPaid, status: newStatus }
  if (newStatus === 'paid') updates.paid_at = new Date().toISOString()

  const { error: invErr } = await supabase
    .from('invoices').update(updates)
    .eq('id', invoiceId).eq('organization_id', orgId)

  if (invErr) return { error: invErr.message }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  return {}
}
