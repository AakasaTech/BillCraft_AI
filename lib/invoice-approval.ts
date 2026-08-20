import { getPlanStatus } from '@/lib/subscription'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function approvalGateActive(orgId: string, supabase: any): Promise<boolean> {
  const plan = await getPlanStatus(orgId, supabase)
  if (!plan.canUseApprovalWorkflow) return false

  // Master enable/disable switch in org settings. When off, no document
  // (invoice, quote, or proforma) requires approval regardless of plan.
  const { data: org } = await supabase
    .from('organizations')
    .select('approval_flow_enabled')
    .eq('id', orgId)
    .single()
  if (!org?.approval_flow_enabled) return false

  // An Agency org with nobody flagged as an approver yet shouldn't have
  // documents stuck with no one able to clear them — gate stays dormant
  // until at least one approver is configured in team settings.
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_invoice_approver', true)
    .is('deleted_at', null)

  return (count ?? 0) > 0
}
