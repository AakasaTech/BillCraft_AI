import Link from 'next/link';
import {
  Globe,
  Users,
  FileDown,
  Wallet,
  BarChart3,
  ArrowRight,
  Check,
  Sparkles,
  Play,
  Shield,
  FileText,
  Brain,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { PricingSection } from '@/components/shared/PricingSection';

// ─── Feature strip (below hero) ───────────────────────────────────────────────

const featureStrip = [
  {
    icon:  Brain,
    title: 'AI-Powered Automation',
    sub:   'GPT-4o invoice generation',
  },
  {
    icon:  FileText,
    title: 'Professional Invoicing',
    sub:   'Branded PDFs, instant delivery',
  },
  {
    icon:  TrendingUp,
    title: 'Real-time Insights',
    sub:   'Revenue analytics at a glance',
  },
  {
    icon:  Shield,
    title: 'Secure & Reliable',
    sub:   'Bank-level 256-bit encryption',
  },
];

// ─── Feature list ─────────────────────────────────────────────────────────────

const features = [
  {
    icon:  Sparkles,
    title: 'AI Invoice Generation',
    description:
      'Type a sentence like "Bill Acme 20 hours design at $75/hr" and get a complete, structured invoice in seconds.',
  },
  {
    icon:  Globe,
    title: 'Multi-Currency & Tax',
    description:
      'Supports USD, EUR, GBP, AUD and 150+ currencies. VAT, GST, and sales tax handled automatically by country.',
  },
  {
    icon:  Users,
    title: 'Client Management',
    description:
      'Store client details, billing preferences, and invoice history. The AI learns your client names.',
  },
  {
    icon:  FileDown,
    title: 'PDF Export',
    description:
      'Professional, branded PDF invoices generated instantly. Attach to email or share a secure link.',
  },
  {
    icon:  Wallet,
    title: 'Payment & Expense Tracking',
    description:
      'Record payments, track outstanding balances, log business expenses, and generate P&L reports.',
  },
  {
    icon:  BarChart3,
    title: 'Revenue Analytics',
    description:
      'Track outstanding invoices, monthly revenue, and overdue amounts at a glance on your dashboard.',
  },
];

// ─── Steps ────────────────────────────────────────────────────────────────────

const steps = [
  {
    number:      '01',
    title:       'Describe the work',
    description: '"Bill TechCorp 8 hours at €120/hr for API integration, net 14 days."',
  },
  {
    number:      '02',
    title:       'AI extracts everything',
    description: 'Client, line items, currency, due date, and taxes are pulled from your sentence instantly.',
  },
  {
    number:      '03',
    title:       'Review, send, get paid',
    description: 'Edit if needed, then send the invoice by email or share a secure link with your client.',
  },
];

// ─── Chart bar heights (hero dashboard mockup) ────────────────────────────────

const BARS = [30, 55, 42, 68, 50, 78, 62, 85, 58, 90, 72, 100];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/app_icon.png" alt="" aria-hidden="true" className="h-8 w-auto" />
            <span className="text-lg font-bold tracking-tight text-foreground">BillCraft AI</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/register" className="bc-btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white">
              Start free trial
            </Link>
          </div>
        </nav>
      </header>

      <main>

        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-20 pb-0 sm:pt-28">

          {/* Soft blue radial behind right column */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(ellipse 70% 80% at 75% 40%, rgba(29,140,255,0.10) 0%, transparent 65%),' +
                'radial-gradient(ellipse 50% 50% at 20% -5%, rgba(37,99,235,0.07) 0%, transparent 60%)',
            }}
          />

          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">

              {/* ── Left: copy ─────────────────────────────────────────────── */}
              <div className="pb-16 lg:pb-28">

                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-[#1D8CFF]/25 bg-[#1D8CFF]/8 px-3.5 py-1.5 text-xs font-semibold text-[#1D8CFF]">
                  <Sparkles className="h-3 w-3" />
                  AI-Powered Invoicing Platform
                </div>

                {/* App name — primary heading Google can read */}
                <h1 className="mt-5 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
                  style={{
                    background:           'linear-gradient(135deg, #1D8CFF 0%, #2563EB 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor:  'transparent',
                    backgroundClip:       'text',
                  }}
                >
                  BillCraft AI
                </h1>

                {/* Tagline */}
                <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Smarter Billing. Stronger Business.
                </p>

                {/* Purpose — explicit for Google verification */}
                <p className="mt-5 max-w-[480px] text-lg leading-relaxed text-muted-foreground">
                  BillCraft AI is an AI-powered invoicing and billing platform for freelancers, consultants, and agencies. Create professional invoices instantly, automate payment reminders, track expenses, and get paid faster.
                </p>

                {/* CTAs */}
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href="/register"
                    className="bc-btn-primary inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white"
                  >
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-7 py-3.5 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1D8CFF]/10">
                      <Play className="h-2.5 w-2.5 translate-x-px text-[#1D8CFF]" fill="currentColor" />
                    </span>
                    Watch Demo
                  </Link>
                </div>

                {/* Trust line */}
                <p className="mt-5 text-sm text-muted-foreground">
                  No credit card required · 60-day free trial · Cancel anytime
                </p>
              </div>

              {/* ── Right: dashboard mockup ─────────────────────────────────── */}
              <div className="relative pb-12 lg:pb-20">

                {/* Floating card — AI Invoice Assistant (top-right) */}
                <div className="absolute -right-2 -top-4 z-20 flex items-center gap-2.5 rounded-2xl border border-border bg-white px-4 py-3 shadow-lg sm:-right-4 lg:-right-6">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1D8CFF]/10">
                    <Sparkles className="h-4 w-4 text-[#1D8CFF]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight">AI Invoice Assistant</p>
                    <p className="text-[10px] text-muted-foreground">Ready to generate</p>
                  </div>
                </div>

                {/* Main dashboard card */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-slate-200/80">

                  {/* Window chrome */}
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                      </div>
                      <span className="ml-2 text-xs font-semibold text-foreground">Revenue Dashboard</span>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">June 2026</span>
                  </div>

                  {/* KPI grid */}
                  <div className="grid grid-cols-2 gap-3 p-4">

                    {/* Total Revenue — blue brand */}
                    <div className="rounded-xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #1D8CFF 0%, #2563EB 100%)' }}>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3 opacity-75" />
                        <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">Total Revenue</p>
                      </div>
                      <p className="mt-2 text-xl font-bold">$48,290</p>
                      <p className="mt-0.5 text-[10px] opacity-70">↑ 12% vs last month</p>
                    </div>

                    {/* Outstanding — amber */}
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                        <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700">Outstanding</p>
                      </div>
                      <p className="mt-2 text-xl font-bold text-amber-900">$8,450</p>
                      <p className="mt-0.5 text-[10px] text-amber-600">6 invoices pending</p>
                    </div>

                    {/* Paid Invoices — green */}
                    <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-green-600" />
                        <p className="text-[10px] font-medium uppercase tracking-wide text-green-700">Paid Invoices</p>
                      </div>
                      <p className="mt-2 text-xl font-bold text-green-900">142</p>
                      <p className="mt-0.5 text-[10px] text-green-600">this year</p>
                    </div>

                    {/* Cash Flow — muted */}
                    <div className="rounded-xl bg-muted p-4">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Cash Flow</p>
                      </div>
                      <p className="mt-2 text-xl font-bold">$12,800</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">net 30 days</p>
                    </div>
                  </div>

                  {/* Mini revenue chart */}
                  <div className="px-4 pb-5">
                    <p className="mb-2 text-[10px] font-medium text-muted-foreground">Revenue — last 12 months</p>
                    <div className="flex items-end gap-1 h-14">
                      {BARS.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm transition-all"
                          style={{
                            height:     `${h}%`,
                            background: i === BARS.length - 1
                              ? 'linear-gradient(180deg, #1D8CFF 0%, #2563EB 100%)'
                              : 'oklch(0.922 0.013 256)',
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                      <span>Jul '25</span>
                      <span>Jan '26</span>
                      <span>Jun '26</span>
                    </div>
                  </div>
                </div>

                {/* Floating card — Payment Received (bottom-left) */}
                <div className="absolute -bottom-3 -left-2 z-20 flex items-center gap-2.5 rounded-2xl border border-border bg-white px-4 py-3 shadow-lg sm:-left-4 lg:-left-8">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-100">
                    <Check className="h-4 w-4 text-green-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700 leading-tight">Payment Received</p>
                    <p className="text-[10px] text-muted-foreground">$2,400 · Acme Inc.</p>
                  </div>
                </div>

                {/* Floating card — Bank-level Security (bottom-right) */}
                <div className="absolute -right-2 bottom-8 z-20 flex items-center gap-2.5 rounded-2xl border border-border bg-white px-4 py-3 shadow-lg sm:-right-4 lg:-right-8">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1D8CFF]/10">
                    <Shield className="h-4 w-4 text-[#1D8CFF]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight">Bank-level Security</p>
                    <p className="text-[10px] text-muted-foreground">256-bit encrypted</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ── Feature icon strip ───────────────────────────────────────────────── */}
        <section className="border-y border-border bg-muted/30 px-6 py-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {featureStrip.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────────── */}
        <section id="how-it-works" className="px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                From thought to invoice in 10 seconds
              </h2>
              <p className="mt-4 text-muted-foreground">No forms, no dropdowns, no friction.</p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="relative">
                  <div className="text-6xl font-bold tabular-nums text-muted/40">{step.number}</div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────────── */}
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
                  <div key={feature.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────────────── */}
        <PricingSection />

        {/* ── CTA strip ────────────────────────────────────────────────────────── */}
        <section className="border-t border-border bg-muted/30 px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to invoice smarter?</h2>
          <p className="mt-4 text-muted-foreground">
            2 months free — no credit card required. Then from $9/mo. No contracts, cancel any time.
          </p>
          <Link
            href="/register"
            className="bc-btn-primary mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white"
          >
            Start your free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/app_icon.png" alt="" aria-hidden="true" className="h-7 w-auto" />
            <span className="text-base font-bold text-foreground">BillCraft AI</span>
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
