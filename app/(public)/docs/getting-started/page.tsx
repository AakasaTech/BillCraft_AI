import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'Getting Started — BillCraft AI Docs',
  description:
    'Create your BillCraft AI account, set up your business profile, add your first client, and send your first invoice.',
}

function Screenshot({ label }: { label: string }) {
  return (
    <div className="my-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      [SCREENSHOT: {label}]
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D8CFF] text-xs font-bold text-white">
        {n}
      </div>
      <div className="flex-1 pb-8">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

export default function GettingStartedPage() {
  return (
    <>
      <DocsBreadcrumb crumbs={[{ label: 'Getting Started' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">Getting started</h1>
      <p className="mt-3 text-muted-foreground">
        From sign-up to sending your first invoice in a few minutes. No prior setup required.
      </p>

      {/* Step-by-step */}
      <div className="mt-10">
        <Step n={1} title="Create your account">
          <p>
            Go to{' '}
            <Link href="/register" className="text-[#1D8CFF] hover:underline">
              billcraft.aakasa.dev/register
            </Link>{' '}
            and sign up with your email and a password, or continue with your Google account.
          </p>
          <p>
            If you signed up with email, check your inbox for a verification link and click it to
            activate your account.
          </p>
          <Screenshot label="Sign-up page with email and Google options" />
        </Step>

        <Step n={2} title="Set up your business profile">
          <p>
            After signing in for the first time you'll be taken through onboarding to create your
            workspace. You can also update these settings any time under{' '}
            <strong>Settings → Organisation</strong>.
          </p>
          <ul className="mt-2 space-y-1.5">
            <li><strong>Business name</strong> — appears on every invoice and email.</li>
            <li><strong>Logo</strong> — upload your logo; it's embedded in PDF invoices.</li>
            <li><strong>Address</strong> — your business address for invoice headers.</li>
            <li><strong>Tax registration number</strong> — required for valid VAT/GST invoices in most countries. Enter your VAT, GST, or ABN number here.</li>
            <li><strong>Default currency</strong> — pre-fills every new invoice (can be overridden per invoice).</li>
            <li><strong>Payment instructions</strong> — bank account details or a payment link that appears at the bottom of every invoice PDF. Save templates here for quick reuse.</li>
          </ul>
          <Screenshot label="Organisation settings form showing name, logo upload, address, tax number, and payment instructions fields" />
        </Step>

        <Step n={3} title="Add your first client">
          <p>
            Go to <strong>Clients → New Client</strong>.
          </p>
          <ul className="mt-2 space-y-1.5">
            <li><strong>Name and email</strong> — required. The email is where invoices are sent.</li>
            <li><strong>Address</strong> — shown in the "Bill To" section of the invoice.</li>
            <li><strong>Preferred currency</strong> — pre-fills invoices for this client.</li>
            <li><strong>CC emails</strong> — any additional addresses that should receive copies of invoices and reminders automatically.</li>
          </ul>
          <Screenshot label="New client form with name, email, address, currency, and CC email fields" />
        </Step>

        <Step n={4} title="Send your first invoice">
          <p>
            Go to <strong>Invoices → New Invoice</strong>. Choose your client from the dropdown.
          </p>
          <p>
            Add at least one line item — description, quantity, and unit price. BillCraft
            calculates the totals automatically.
          </p>
          <p>
            Set the payment terms (e.g. Net 30) or pick a specific due date. Choose your currency
            and tax type if applicable.
          </p>
          <p>
            Click <strong>Save</strong> to create a draft, then <strong>Send Invoice</strong> to
            email it to your client. They'll receive the PDF attached to the email and a link to
            view the invoice online.
          </p>
          <Screenshot label="Invoice editor with client selected, line items filled in, and the Send button highlighted" />
          <div className="mt-3 rounded-lg border border-[#1D8CFF]/20 bg-[#1D8CFF]/5 px-4 py-3">
            <p className="font-medium text-foreground">Tip — try AI invoice generation</p>
            <p className="mt-1">
              On Pro and Agency plans, you can type a sentence like{' '}
              <em>"Bill Acme Corp 3 days of consulting at $800/day, net 14, 20% VAT"</em> and
              BillCraft fills in all the fields for you. See{' '}
              <Link href="/docs/ai-features" className="text-[#1D8CFF] hover:underline">
                AI Features
              </Link>
              .
            </p>
          </div>
        </Step>
      </div>

      {/* Related links */}
      <div className="mt-4 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">Related articles</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li><Link href="/docs/invoices" className="text-[#1D8CFF] hover:underline">Creating and sending invoices →</Link></li>
          <li><Link href="/docs/ai-features" className="text-[#1D8CFF] hover:underline">AI invoice generation →</Link></li>
          <li><Link href="/docs/notifications-and-email" className="text-[#1D8CFF] hover:underline">Email & notifications →</Link></li>
        </ul>
      </div>
    </>
  )
}
