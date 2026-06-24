import Link from 'next/link';
import {
  Zap,
  Globe,
  Users,
  FileDown,
  Wallet,
  BarChart3,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react';

// ─── Feature list ─────────────────────────────────────────────────────────────

const features = [
  {
    icon: Sparkles,
    title: 'AI Invoice Generation',
    description:
      'Type a sentence like "Bill Acme 20 hours design at $75/hr" and get a complete, structured invoice in seconds.',
  },
  {
    icon: Globe,
    title: 'Multi-Currency & Tax',
    description:
      'Supports USD, EUR, GBP, AUD and 150+ currencies. VAT, GST, and sales tax handled automatically by country.',
  },
  {
    icon: Users,
    title: 'Client Management',
    description:
      'Store client details, billing preferences, and invoice history. The AI learns your client names.',
  },
  {
    icon: FileDown,
    title: 'PDF Export',
    description:
      'Professional, branded PDF invoices generated instantly. Attach to email or share a secure link.',
  },
  {
    icon: Wallet,
    title: 'Payment & Expense Tracking',
    description:
      'Record payments, track outstanding balances, log business expenses, and generate P&L reports.',
  },
  {
    icon: BarChart3,
    title: 'Revenue Analytics',
    description:
      'Track outstanding invoices, monthly revenue, and overdue amounts at a glance on your dashboard.',
  },
];

// ─── Pricing ──────────────────────────────────────────────────────────────────

const plans = [
  {
    name: 'Basic',
    price: '$9',
    period: 'per month',
    annual: '$79 / year — save 27%',
    description: 'For freelancers just getting started.',
    features: [
      '5 clients',
      '20 invoices per month',
      'PDF download & email',
      'Payment tracking',
      'Basic support',
    ],
    cta: 'Start free trial',
    href: '/register',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    annual: '$190 / year — save 17%',
    description: 'For active freelancers and solo consultants.',
    features: [
      'Unlimited clients',
      'Unlimited invoices',
      'AI invoice generation',
      'Expense tracking & P&L reports',
      'Recurring invoices',
      'Invoice templates',
      'Multi-currency support',
      'PDF branded with your logo',
      'Email delivery + tracking',
      'Overdue reminders',
      'Revenue analytics',
    ],
    cta: 'Start free trial',
    href: '/register',
    highlighted: true,
    badge: 'Most popular',
  },
  {
    name: 'Agency',
    price: '$39',
    period: 'per month',
    annual: '$390 / year — save 17%',
    description: 'For agencies and teams billing multiple clients.',
    features: [
      'Everything in Pro',
      'Multiple team members',
      'Multi-org management',
      'White-label PDFs',
      'API access',
      'Dedicated support',
    ],
    cta: 'Start free trial',
    href: '/register',
    highlighted: false,
    badge: null,
  },
];

// ─── Steps ────────────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    title: 'Describe the work',
    description:
      '"Bill TechCorp 8 hours at €120/hr for API integration, net 14 days."',
  },
  {
    number: '02',
    title: 'AI extracts everything',
    description:
      'Client, line items, currency, due date, and taxes are pulled from your sentence instantly.',
  },
  {
    number: '03',
    title: 'Review, send, get paid',
    description:
      'Edit if needed, then send the invoice by email or share a secure link with your client.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <Zap className="h-5 w-5 text-primary" />
            BillCraft AI
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-24 sm:py-32">
          {/* Gradient background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.7 0.15 264) / 15%, transparent 70%)',
            }}
          />
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Powered by GPT-4o structured outputs
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Invoice in seconds,
              <br />
              <span className="text-muted-foreground">not hours.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Describe the work in plain English. BillCraft AI extracts the client, line items, currency, and taxes — then generates a professional PDF ready to share with your client.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:shadow-xl"
              >
                Start 2-month free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                See how it works →
              </Link>
            </div>
          </div>

          {/* Mock invoice prompt UI */}
          <div className="mx-auto mt-20 max-w-3xl">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-3.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-muted-foreground">BillCraft AI — new invoice</span>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1 rounded-xl bg-muted/60 px-4 py-3 text-sm text-foreground">
                    &quot;Bill Acme Inc. for website redesign — 20 hours at $75/hr, due in 14 days.&quot;
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">INV-2026-0042</span>
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Draft</span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Client</span>
                      <span className="font-medium">Acme Inc.</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Website redesign services</span>
                      <span>20h × $75.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Due</span>
                      <span>July 6, 2026</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                      <span>Total</span>
                      <span>$1,500.00</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground">
                    Send invoice
                  </button>
                  <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                From thought to invoice in 10 seconds
              </h2>
              <p className="mt-4 text-muted-foreground">
                No forms, no dropdowns, no friction.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="relative">
                  <div className="text-6xl font-bold text-muted/40 tabular-nums">
                    {step.number}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border bg-muted/30 px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything a freelancer needs
              </h2>
              <p className="mt-4 text-muted-foreground">
                Built around how you actually work — not how invoicing software thinks you should.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-muted-foreground">
                2-month free trial on every account — no credit card required.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    plan.highlighted
                      ? 'border-primary bg-primary text-primary-foreground shadow-2xl scale-105'
                      : 'border-border bg-card'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary-foreground px-4 py-0.5 text-xs font-semibold text-primary">
                      {plan.badge}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className={`text-sm ${plan.highlighted ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        / {plan.period}
                      </span>
                    </div>
                    {plan.annual && (
                      <p className={`mt-1 text-xs ${plan.highlighted ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        or {plan.annual}
                      </p>
                    )}
                    <p className={`mt-2 text-sm ${plan.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {plan.description}
                    </p>
                  </div>
                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? 'text-primary-foreground' : 'text-primary'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`mt-8 block rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all ${
                      plan.highlighted
                        ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              All plans include a 2-month free trial — no credit card required. Upgrade or cancel any time.
            </p>
          </div>
        </section>

        {/* CTA strip */}
        <section className="border-t border-border bg-muted/30 px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to invoice smarter?
          </h2>
          <p className="mt-4 text-muted-foreground">
            2 months free — no credit card required. Then from $9/mo. No contracts, cancel any time.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
          >
            Start your free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-primary" />
            BillCraft AI
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BillCraft AI. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
