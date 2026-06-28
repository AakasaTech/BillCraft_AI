export const TRIAL_CLIENT_LIMIT          = 1
export const TRIAL_INVOICE_MONTHLY_LIMIT = 5
export const BASIC_CLIENT_LIMIT          = 5
export const BASIC_INVOICE_MONTHLY_LIMIT = 20

// Plans that include Pro-tier features (expenses, recurring, templates, AI)
const PRO_PLANS = new Set(['pro', 'agency'])

export type PlanStatus = {
  status:                   'trial' | 'active' | 'expired'
  plan:                     string
  trialEndsAt:              string | null
  trialDaysLeft:            number | null
  clientLimit:              number   // -1 = unlimited
  invoiceMonthlyLimit:      number   // -1 = unlimited
  currentClientCount:       number
  currentMonthInvoiceCount: number
  canCreateClient:          boolean
  canCreateInvoice:         boolean
  // Pro-tier features — not available on Basic
  canUseAI:                 boolean
  canUseExpenses:           boolean
  canUseRecurring:          boolean
  canUseTemplates:          boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPlanStatus(orgId: string, supabase: any): Promise<PlanStatus> {
  const now        = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: sub },
    { data: org },
    { count: clientCount },
    { count: invoiceCount },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single(),

    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null),

    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .gte('created_at', monthStart),
  ])

  const cc = clientCount  ?? 0
  const ic = invoiceCount ?? 0

  // ── Admin-granted free pass (highest priority) ────────────────────────────
  if (org?.freepass_until && new Date(org.freepass_until) > now && org.freepass_plan) {
    const plan  = (org.freepass_plan as string).toLowerCase()
    const isPro = PRO_PLANS.has(plan)
    return {
      status:                   'active',
      plan:                     `freepass:${plan}`,
      trialEndsAt:              null,
      trialDaysLeft:            null,
      clientLimit:              -1,
      invoiceMonthlyLimit:      -1,
      currentClientCount:       cc,
      currentMonthInvoiceCount: ic,
      canCreateClient:          true,
      canCreateInvoice:         true,
      canUseAI:                 isPro,
      canUseExpenses:           isPro,
      canUseRecurring:          isPro,
      canUseTemplates:          isPro,
    }
  }

  // ── Active paid subscription ───────────────────────────────────────────────
  if (sub) {
    const plan     = (sub.plan_name ?? 'pro').toLowerCase()
    const isPro    = PRO_PLANS.has(plan)
    const isBasic  = plan === 'basic'

    if (isBasic) {
      return {
        status:                   'active',
        plan,
        trialEndsAt:              null,
        trialDaysLeft:            null,
        clientLimit:              BASIC_CLIENT_LIMIT,
        invoiceMonthlyLimit:      BASIC_INVOICE_MONTHLY_LIMIT,
        currentClientCount:       cc,
        currentMonthInvoiceCount: ic,
        canCreateClient:          cc < BASIC_CLIENT_LIMIT,
        canCreateInvoice:         ic < BASIC_INVOICE_MONTHLY_LIMIT,
        canUseAI:                 false,
        canUseExpenses:           false,
        canUseRecurring:          false,
        canUseTemplates:          false,
      }
    }

    // Pro or Agency
    return {
      status:                   'active',
      plan,
      trialEndsAt:              null,
      trialDaysLeft:            null,
      clientLimit:              -1,
      invoiceMonthlyLimit:      -1,
      currentClientCount:       cc,
      currentMonthInvoiceCount: ic,
      canCreateClient:          true,
      canCreateInvoice:         true,
      canUseAI:                 isPro,
      canUseExpenses:           isPro,
      canUseRecurring:          isPro,
      canUseTemplates:          isPro,
    }
  }

  // ── Trial period — all Pro features, limited clients/invoices ─────────────
  const trialEnd = org?.trial_ends_at ? new Date(org.trial_ends_at) : null
  if (trialEnd && trialEnd > now) {
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / 86_400_000)
    return {
      status:                   'trial',
      plan:                     'trial',
      trialEndsAt:              org!.trial_ends_at,
      trialDaysLeft:            daysLeft,
      clientLimit:              TRIAL_CLIENT_LIMIT,
      invoiceMonthlyLimit:      TRIAL_INVOICE_MONTHLY_LIMIT,
      currentClientCount:       cc,
      currentMonthInvoiceCount: ic,
      canCreateClient:          cc < TRIAL_CLIENT_LIMIT,
      canCreateInvoice:         ic < TRIAL_INVOICE_MONTHLY_LIMIT,
      canUseAI:                 true,
      canUseExpenses:           true,
      canUseRecurring:          true,
      canUseTemplates:          true,
    }
  }

  // ── Trial expired, no paid plan ───────────────────────────────────────────
  return {
    status:                   'expired',
    plan:                     'expired',
    trialEndsAt:              org?.trial_ends_at ?? null,
    trialDaysLeft:            0,
    clientLimit:              0,
    invoiceMonthlyLimit:      0,
    currentClientCount:       cc,
    currentMonthInvoiceCount: ic,
    canCreateClient:          false,
    canCreateInvoice:         false,
    canUseAI:                 false,
    canUseExpenses:           false,
    canUseRecurring:          false,
    canUseTemplates:          false,
  }
}
