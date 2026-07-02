import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'FAQ — BillCraft AI Docs',
  description:
    'Answers to common questions about tax handling, currencies, team access, the client portal, security, and BillCraft AI plans.',
}

const FAQS = [
  {
    q: 'Which tax types does BillCraft AI support?',
    a: 'BillCraft AI supports VAT (Value Added Tax), GST (Goods and Services Tax), and US-style Sales Tax. You can also choose "None" for tax-exempt invoices. Select the tax type per invoice and enter the applicable rate as a percentage. Your tax registration number (VAT number, ABN, etc.) can be saved in Settings → Organisation and will appear automatically on every invoice PDF.',
  },
  {
    q: 'Can I send invoices in multiple currencies?',
    a: 'Yes. BillCraft AI supports over 150 currencies including USD, EUR, GBP, AUD, CAD, JPY, CHF, and INR. The currency is set per invoice, so you can bill different clients in different currencies. Set a default currency for your organisation in Settings → Organisation, and a preferred currency per client to pre-fill new invoices automatically.',
  },
  {
    q: 'Does BillCraft AI process card payments from my clients?',
    a: 'No. BillCraft AI does not process card payments on your behalf. You receive payment through your own bank account, PayPal, or any payment link you choose. Add your bank details or payment link to the Payment Instructions field on each invoice — or save templates in Settings → Organisation. BillCraft lets you record payments as they arrive to keep your books accurate.',
  },
  {
    q: 'Can my clients pay directly through the invoice link?',
    a: 'Not through BillCraft itself. The client-facing invoice page shows your payment instructions (bank transfer details, a PayPal link, Stripe payment link, etc.) so clients know how and where to pay. You then record the payment in BillCraft once it arrives.',
  },
  {
    q: 'What is the client portal?',
    a: 'When you send an invoice or estimate, BillCraft generates a unique secure link for your client. Clients can open this link to view the invoice or estimate online, download it as a PDF, and — for estimates — accept or reject it. The portal is view-only for invoices; clients cannot edit or mark invoices as paid from their side.',
  },
  {
    q: 'Can I add team members to my account?',
    a: 'Team member support is available on the Agency plan. Invite team members from Settings → Team. Each member gets their own login and can manage invoices, clients, and estimates within your organisation.',
  },
  {
    q: 'Does my client need a BillCraft account to view the invoice?',
    a: 'No. Invoice and estimate links are accessible without a BillCraft account. Clients just click the link in the email to view their invoice or estimate in a browser. No sign-up or login is required on their side.',
  },
  {
    q: 'How do recurring invoices work?',
    a: 'You set up a recurring invoice schedule with a frequency (weekly, monthly, quarterly, etc.) and line items. On each billing date, BillCraft creates a new invoice draft — it does not auto-send. You review and send each draft manually. This lets you adjust quantities or notes before the client receives anything. Recurring billing is available on Pro and Agency plans.',
  },
  {
    q: 'Is my data secure?',
    a: 'BillCraft AI is built on Supabase, which uses PostgreSQL with row-level security to ensure each user can only access their own data. All traffic is encrypted in transit via HTTPS/TLS. Passwords are never stored — authentication uses hashed credentials or Google OAuth 2.0 with PKCE. Invoice share links use unguessable tokens rather than sequential IDs.',
  },
  {
    q: 'What happens if I downgrade my plan?',
    a: 'If you downgrade from Pro or Agency to the Starter plan, AI features, recurring billing, and expenses will no longer be accessible. Your existing data (invoices, recurring schedules, expenses) is preserved and will become accessible again if you upgrade. Nothing is deleted when you downgrade.',
  },
]

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export default function DocsFaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />
      <DocsBreadcrumb crumbs={[{ label: 'FAQ' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">Frequently asked questions</h1>
      <p className="mt-3 text-muted-foreground">
        Quick answers to the most common questions about BillCraft AI.
      </p>

      <div className="mt-10 space-y-4">
        {FAQS.map(({ q, a }) => (
          <details
            key={q}
            className="group rounded-xl border border-border bg-card px-5 py-4 open:shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold text-foreground">
              <span>{q}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-[#1D8CFF]/20 bg-[#1D8CFF]/5 p-6">
        <p className="font-semibold">Still have questions?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the full documentation or visit the{' '}
          <Link href="/faq" className="text-[#1D8CFF] hover:underline">
            general FAQ
          </Link>{' '}
          for more answers. You can also{' '}
          <Link href="/register" className="text-[#1D8CFF] hover:underline">
            start a free trial
          </Link>{' '}
          and explore BillCraft AI hands-on.
        </p>
      </div>

      <div className="mt-8 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">Related articles</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li><Link href="/docs/invoices" className="text-[#1D8CFF] hover:underline">Invoices — all features explained →</Link></li>
          <li><Link href="/docs/recurring-billing" className="text-[#1D8CFF] hover:underline">Recurring billing →</Link></li>
          <li><Link href="/docs/ai-features" className="text-[#1D8CFF] hover:underline">AI features →</Link></li>
          <li><Link href="/docs/getting-started" className="text-[#1D8CFF] hover:underline">Getting started →</Link></li>
        </ul>
      </div>
    </>
  )
}
