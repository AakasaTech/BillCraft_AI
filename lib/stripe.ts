import Stripe from 'stripe'

// Lazy Stripe client — only instantiated when a method is actually called,
// so importing PLANS from this module never crashes if the key is absent.
let _stripe: Stripe | null = null

function lazyStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
    _stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia', typescript: true })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_t, prop, receiver) {
    return Reflect.get(lazyStripe(), prop, receiver)
  },
})

export const PLANS = {
  basic: {
    key:      'basic' as const,
    name:     'Basic',
    monthly:  9,
    annual:   89,
    get monthlyPriceId() { return process.env.STRIPE_BASIC_MONTHLY_PRICE_ID ?? null },
    get annualPriceId()  { return process.env.STRIPE_BASIC_ANNUAL_PRICE_ID  ?? null },
    features: [
      '5 clients',
      '20 invoices / month',
      'PDF download & email',
      'Payment tracking',
      'Basic support',
    ],
  },
  pro: {
    key:      'pro' as const,
    name:     'Pro',
    monthly:  19,
    annual:   189,
    get monthlyPriceId() { return process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? null },
    get annualPriceId()  { return process.env.STRIPE_PRO_ANNUAL_PRICE_ID  ?? null },
    features: [
      'Unlimited clients',
      'Unlimited invoices',
      'AI invoice generation',
      'Expense tracking & P&L reports',
      'Recurring invoices',
      'Invoice templates',
      'PDF download & email',
      'Priority support',
    ],
  },
  agency: {
    key:      'agency' as const,
    name:     'Agency',
    monthly:  39,
    annual:   389,
    get monthlyPriceId() { return process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID ?? null },
    get annualPriceId()  { return process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID  ?? null },
    features: [
      'Everything in Pro',
      'Multiple team members',
      'Multi-org management',
      'White-label PDFs',
      'API access',
      'Dedicated support',
    ],
  },
} as const

export type PlanKey = keyof typeof PLANS

// Currencies with no decimal subunit (amount is already the smallest unit)
const ZERO_DECIMAL = new Set([
  'BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF',
])

export const toStripeAmount   = (n: number, cur: string) =>
  ZERO_DECIMAL.has(cur.toUpperCase()) ? Math.round(n) : Math.round(n * 100)

export const fromStripeAmount = (n: number, cur: string) =>
  ZERO_DECIMAL.has(cur.toUpperCase()) ? n : n / 100
