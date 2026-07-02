import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'Invoices — BillCraft AI Docs',
  description:
    'Create, customise, and send invoices in BillCraft AI. Learn about line items, tax types, currencies, invoice statuses, and what your clients see.',
}

function Screenshot({ label }: { label: string }) {
  return (
    <div className="my-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      [SCREENSHOT: {label}]
    </div>
  )
}

const STATUSES = [
  { name: 'Draft',     color: 'bg-muted text-muted-foreground',        desc: 'Created but not yet sent. Only visible to you.' },
  { name: 'Sent',      color: 'bg-blue-100 text-blue-700',             desc: 'Emailed to the client. Awaiting payment.' },
  { name: 'Viewed',    color: 'bg-indigo-100 text-indigo-700',         desc: 'Client opened the invoice link.' },
  { name: 'Partial',   color: 'bg-amber-100 text-amber-700',           desc: 'A partial payment has been recorded.' },
  { name: 'Paid',      color: 'bg-green-100 text-green-700',           desc: 'Fully paid and closed.' },
  { name: 'Overdue',   color: 'bg-red-100 text-red-700',               desc: 'Past the due date with an outstanding balance.' },
  { name: 'Cancelled', color: 'bg-slate-100 text-slate-600',           desc: 'Cancelled — no longer expected for payment.' },
  { name: 'Void',      color: 'bg-slate-100 text-slate-400',           desc: 'Voided for correction purposes. Treated as if it never existed.' },
]

export default function InvoicesPage() {
  return (
    <>
      <DocsBreadcrumb crumbs={[{ label: 'Invoices' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">Invoices</h1>
      <p className="mt-3 text-muted-foreground">
        Everything you need to know about creating, customising, and sending invoices in BillCraft AI.
      </p>

      {/* Creating */}
      <h2 className="mt-10 text-xl font-bold">Creating an invoice</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Go to <strong>Invoices → New Invoice</strong>. You have two options:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        <li>
          <strong>Manual form</strong> — select a client, fill in the fields, and add line items
          one by one.
        </li>
        <li>
          <strong>AI invoice generation</strong> (Pro / Agency) — type a plain-language description
          of the work and BillCraft fills everything in for you. See{' '}
          <Link href="/docs/ai-features" className="text-[#1D8CFF] hover:underline">
            AI Features
          </Link>
          .
        </li>
      </ul>
      <Screenshot label="New invoice form showing client dropdown, invoice number, issue/due date fields, and the AI description box" />

      {/* Line items */}
      <h2 className="mt-10 text-xl font-bold">Line items</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Each invoice can have as many line items as you need. For every line item, enter:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li><strong>Description</strong> — what was delivered or provided.</li>
        <li><strong>Quantity</strong> — hours, days, units, or any other measure.</li>
        <li><strong>Unit price</strong> — price per unit in the invoice currency.</li>
      </ul>
      <p className="mt-2 text-sm text-muted-foreground">
        The line total and the overall subtotal update automatically as you type.
      </p>

      {/* Tax */}
      <h2 className="mt-10 text-xl font-bold">Tax</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose the tax type that applies to this invoice, then enter the rate as a percentage.
        BillCraft calculates the tax amount and shows it separately on the invoice.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { name: 'VAT', desc: 'Value Added Tax — used in the EU, UK, and many other countries.' },
          { name: 'GST', desc: 'Goods and Services Tax — used in Australia, New Zealand, Canada, and India.' },
          { name: 'Sales Tax', desc: 'US-style flat percentage applied to the sale.' },
          { name: 'None', desc: 'No tax on this invoice.' },
        ].map(({ name, desc }) => (
          <div key={name} className="rounded-lg border border-border bg-card p-3 text-sm">
            <p className="font-medium">{name}</p>
            <p className="mt-0.5 text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Your tax registration number (VAT, GST, ABN, etc.) is pulled automatically from{' '}
        <strong>Settings → Organisation</strong> and appears on the PDF — required for valid B2B
        tax invoices in most jurisdictions.
      </p>

      {/* Discounts */}
      <h2 className="mt-10 text-xl font-bold">Discounts</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter a flat discount amount in the invoice currency. The discount is subtracted from the
        subtotal before tax is applied. It appears as its own line on the invoice PDF.
      </p>

      {/* Currency */}
      <h2 className="mt-10 text-xl font-bold">Currency</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        BillCraft AI supports over 150 currencies including USD, EUR, GBP, AUD, CAD, JPY, CHF,
        INR, and more. The currency is set per invoice and appears on the PDF and the client's
        share link. You can set a default currency in <strong>Settings → Organisation</strong> and
        a preferred currency per client.
      </p>

      {/* Statuses */}
      <h2 className="mt-10 text-xl font-bold">Invoice statuses</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Every invoice has one of the following statuses:
      </p>
      <div className="mt-4 space-y-2">
        {STATUSES.map(({ name, color, desc }) => (
          <div key={name} className="flex items-start gap-3 text-sm">
            <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}>
              {name}
            </span>
            <span className="text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>

      {/* Sending */}
      <h2 className="mt-10 text-xl font-bold">Sending an invoice</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Open any draft invoice and click <strong>Send Invoice</strong>. BillCraft will:
      </p>
      <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
        <li>Generate a PDF of the invoice.</li>
        <li>Send an email to your client with the PDF attached.</li>
        <li>Include a secure link so the client can view the invoice online.</li>
        <li>CC any additional email addresses you've set on the client record.</li>
        <li>Update the invoice status from Draft to Sent.</li>
      </ol>
      <Screenshot label="Invoice detail page with the Send Invoice button and email preview" />

      {/* What client sees */}
      <h2 className="mt-10 text-xl font-bold">What the client sees</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Clicking the link in the email takes clients to a public page at{' '}
        <code className="rounded bg-muted px-1 text-xs">billcraft.aakasa.dev/p/[token]</code>.
        This page shows:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li>Your business logo and name, the client's billing address.</li>
        <li>Invoice number, issue date, due date, and status.</li>
        <li>All line items with descriptions, quantities, unit prices, and amounts.</li>
        <li>Subtotal, discount (if any), tax, and the total amount due.</li>
        <li>Your payment instructions (bank details or payment link).</li>
        <li>A button to download the invoice as a PDF.</li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        When the client opens this link, the invoice status updates automatically from Sent to
        Viewed.
      </p>
      <Screenshot label="Public invoice page as seen by a client — showing logo, invoice details, line items, and payment instructions" />

      {/* Related */}
      <div className="mt-10 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">Related articles</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li><Link href="/docs/payments" className="text-[#1D8CFF] hover:underline">Recording payments and sending reminders →</Link></li>
          <li><Link href="/docs/estimates" className="text-[#1D8CFF] hover:underline">Estimates and quotes →</Link></li>
          <li><Link href="/docs/ai-features" className="text-[#1D8CFF] hover:underline">AI invoice generation →</Link></li>
          <li><Link href="/docs/recurring-billing" className="text-[#1D8CFF] hover:underline">Recurring invoices →</Link></li>
        </ul>
      </div>
    </>
  )
}
