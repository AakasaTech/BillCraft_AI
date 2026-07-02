import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export const metadata: Metadata = {
  title: 'FAQ — BillCraft AI',
  description:
    'Answers to common questions about BillCraft AI — pricing, AI invoice generation, currencies, reminders, security, and more.',
}

const FAQS = [
  {
    q: 'What is BillCraft AI?',
    a: 'BillCraft AI is an AI-powered invoicing and billing platform for freelancers, consultants, and agencies. It lets you create professional invoices by describing your work in plain language, automate payment reminders, track expenses, and get paid faster — all from one place.',
  },
  {
    q: 'How does AI invoice generation work?',
    a: 'Simply type a sentence such as "Bill Acme Corp 20 hours of design work at $75/hr, net 30" and BillCraft AI uses GPT-4o to extract the client name, line items, currency, due date, and applicable taxes automatically — generating a complete, structured invoice in seconds.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. BillCraft AI offers a 60-day free trial with no credit card required. You can sign up and start creating invoices immediately. After the trial you choose a paid plan to continue.',
  },
  {
    q: 'What pricing plans are available?',
    a: 'BillCraft AI offers three plans — Basic at $9/month (or $79/year), Pro at $19/month (or $190/year), and Agency at $39/month (or $390/year). All plans start with a 60-day free trial and can be cancelled at any time.',
  },
  {
    q: 'What currencies does BillCraft AI support?',
    a: 'BillCraft AI supports over 150 currencies including USD, EUR, GBP, AUD, CAD, JPY, and more. VAT, GST, and sales tax rates are handled automatically based on the invoice country.',
  },
  {
    q: 'Can I send invoices directly to clients?',
    a: 'Yes. You can email invoices directly from BillCraft AI, share a secure payment link, or download a branded PDF to send yourself. BillCraft AI also tracks when clients open and view their invoices.',
  },
  {
    q: 'Does BillCraft AI support recurring invoices?',
    a: 'Yes. You can set up recurring invoice schedules on weekly, biweekly, monthly, quarterly, or yearly frequencies. BillCraft AI automatically generates draft invoices on your chosen schedule so you can review and send them.',
  },
  {
    q: 'How do automated payment reminders work?',
    a: 'From Settings → Notifications you can enable automatic payment reminders and choose when to send them — for example, 3 days before the due date, on the due date, or 7 days after it is overdue. BillCraft AI sends personalised reminder emails with the invoice PDF attached on your selected schedule.',
  },
  {
    q: 'Can I use BillCraft AI with my team?',
    a: 'Yes. The Agency plan supports multiple team members with role-based access, multi-organisation management, white-label PDFs, API access, and dedicated support — ideal for agencies billing multiple clients.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. BillCraft AI uses 256-bit encryption to protect your data at rest and in transit. Your invoices, client information, and payment records are stored on enterprise-grade infrastructure backed by Supabase.',
  },
] as const

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-20">

        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">Frequently asked questions</h1>
          <p className="mt-4 text-muted-foreground">
            Everything you need to know about BillCraft AI.{' '}
            <Link href="/register" className="text-[#1D8CFF] hover:underline">
              Start your free trial
            </Link>{' '}
            or{' '}
            <a href="mailto:support@aakasa.dev" className="text-[#1D8CFF] hover:underline">
              contact support
            </a>{' '}
            if you have another question.
          </p>
        </div>

        <dl className="divide-y divide-border">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <dt className="text-base font-semibold">{q}</dt>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</dd>
            </details>
          ))}
        </dl>

        <div className="mt-16 rounded-2xl border border-[#1D8CFF]/20 bg-[#1D8CFF]/5 px-8 py-8 text-center">
          <h2 className="text-lg font-semibold">Ready to get started?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            60-day free trial · No credit card required · Cancel any time
          </p>
          <Link
            href="/register"
            className="bc-btn-primary mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
          >
            Start free trial
          </Link>
        </div>

      </div>
    </>
  )
}
