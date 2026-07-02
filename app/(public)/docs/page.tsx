import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Zap, FileText, ClipboardList, RefreshCw,
  CreditCard, TrendingDown, Sparkles, Bell, HelpCircle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documentation — BillCraft AI',
  description:
    'Everything you need to know about BillCraft AI — invoicing, recurring billing, AI features, payments, and more.',
}

const CATEGORIES = [
  {
    href:        '/docs/getting-started',
    icon:        Zap,
    label:       'Getting Started',
    description: 'Create your account, set up your business profile, and send your first invoice.',
  },
  {
    href:        '/docs/invoices',
    icon:        FileText,
    label:       'Invoices',
    description: 'Create, customise, and send invoices. Understand statuses, taxes, currencies, and what your clients see.',
  },
  {
    href:        '/docs/estimates',
    icon:        ClipboardList,
    label:       'Estimates',
    description: 'Send quotes to clients, collect their response, and convert accepted estimates to invoices.',
  },
  {
    href:        '/docs/recurring-billing',
    icon:        RefreshCw,
    label:       'Recurring Billing',
    description: 'Automate retainer and subscription invoices on weekly, monthly, or custom schedules.',
  },
  {
    href:        '/docs/payments',
    icon:        CreditCard,
    label:       'Payments',
    description: 'Set payment terms, record received payments, and automate follow-up reminders.',
  },
  {
    href:        '/docs/expenses',
    icon:        TrendingDown,
    label:       'Expenses',
    description: 'Log business expenses by category and track them alongside your revenue.',
  },
  {
    href:        '/docs/ai-features',
    icon:        Sparkles,
    label:       'AI Features',
    description: 'Generate invoices from a single sentence and get AI-drafted payment reminder messages.',
  },
  {
    href:        '/docs/notifications-and-email',
    icon:        Bell,
    label:       'Email & Notifications',
    description: 'Learn what emails your clients receive, how to customise your sender address, and configure automated reminders.',
  },
  {
    href:        '/docs/faq',
    icon:        HelpCircle,
    label:       'FAQ',
    description: 'Common questions on tax handling, currencies, team access, security, and more.',
  },
]

export default function DocsIndexPage() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">BillCraft AI Documentation</h1>
      <p className="mt-3 text-muted-foreground">
        Guides and references for every feature in BillCraft AI. Pick a category to get started.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-[#1D8CFF]/40 hover:bg-[#1D8CFF]/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1D8CFF]/10 text-[#1D8CFF] transition-colors group-hover:bg-[#1D8CFF]/15">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-[#1D8CFF]/20 bg-[#1D8CFF]/5 p-6">
        <p className="font-semibold">Not sure where to start?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Head to{' '}
          <Link href="/docs/getting-started" className="text-[#1D8CFF] hover:underline">
            Getting Started
          </Link>{' '}
          to set up your account and send your first invoice in under 5 minutes. Or{' '}
          <Link href="/register" className="text-[#1D8CFF] hover:underline">
            sign up free
          </Link>{' '}
          and follow the in-app onboarding guide.
        </p>
      </div>
    </div>
  )
}
