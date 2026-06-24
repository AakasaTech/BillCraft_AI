import type { AuditAction } from '@/types/database'

interface AuditParams {
  orgId:      string
  userId:     string | null
  entityType: string
  entityId:   string
  action:     AuditAction
  newValues?: unknown
  oldValues?: unknown
}

// Fire-and-forget — never awaited so it never blocks the calling action.
// Uses any because the supabase client type varies (user vs. service client).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logAudit(supabase: any, params: AuditParams): void {
  void supabase.from('audit_logs').insert({
    organization_id: params.orgId,
    user_id:         params.userId,
    entity_type:     params.entityType,
    entity_id:       params.entityId,
    action:          params.action,
    new_values:      params.newValues ?? null,
    old_values:      params.oldValues ?? null,
    ip_address:      null,
    user_agent:      null,
  })
}
