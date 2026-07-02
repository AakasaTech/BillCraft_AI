import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'Estimates — BillCraft AI Docs',
  description:
    'Send professional estimates and quotes to clients. Collect acceptances or rejections and convert accepted estimates into invoices.',
}

function Screenshot({ label }: { label: string }) {
  return (
    <div className="my-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      [SCREENSHOT: {label}]
    </div>
  )
}

const STATUSES = [
  { name: 'Draft',    color: 'bg-muted text-muted-foreground',  desc: 'Created but not yet sent to the client.' },
  { name: 'Sent',     color: 'bg-blue-100 text-blue-700',       desc: 'Sent and awaiting the client\'s response.' },
  { name: 'Viewed',   color: 'bg-indigo-100 text-indigo-700',   desc: 'Client has opened the estimate link.' },
  { name: 'Accepted', color: 'bg-green-100 text-green-700',     desc: 'Client accepted — ready to convert to an invoice.' },
  { name: 'Rejected', color: 'bg-red-100 text-red-700',         desc: 'Client declined the estimate.' },
  { name: 'Expired',  color: 'bg-amber-100 text-amber-700',     desc: 'Past the expiry date with no response.' },
]

export default function EstimatesPage() {
  return (
    <>
      <DocsBreadcrumb crumbs={[{ label: 'Estimates' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">Estimates</h1>
      <p className="mt-3 text-muted-foreground">
        Send professional quotes to clients before any work begins. Clients can accept or reject
        directly from the link you send them — and when they accept, you can convert the estimate
        to an invoice in one click.
      </p>

      {/* Creating */}
      <h2 className="mt-10 text-xl font-bold">Creating an estimate</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Go to <strong>Estimates → New Estimate</strong>. The form is very similar to the invoice
        editor:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li><strong>Client</strong> — select an existing client or create one inline.</li>
        <li><strong>Estimate number</strong> — auto-increments; you can override it.</li>
        <li><strong>Issue date and expiry date</strong> — the estimate becomes Expired after the expiry date if the client hasn't responded.</li>
        <li><strong>Line items</strong> — description, quantity, and unit price. Add as many as needed.</li>
        <li><strong>Tax, discount, currency</strong> — same options as invoices.</li>
        <li><strong>Notes</strong> — any scope, terms, or conditions to include on the estimate.</li>
      </ul>
      <Screenshot label="New estimate form with client dropdown, expiry date, line items, and notes field" />

      {/* Sending */}
      <h2 className="mt-10 text-xl font-bold">Sending an estimate</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Click <strong>Send Estimate</strong>. BillCraft emails the client with a PDF of the
        estimate attached and a link they can click to view and respond to it online. The status
        changes from Draft to Sent.
      </p>
      <Screenshot label="Estimate detail page showing Send Estimate button and email preview" />

      {/* What client sees */}
      <h2 className="mt-10 text-xl font-bold">What the client sees</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The client opens the link in their email and sees a page showing the full estimate details.
        At the bottom of the page they can:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li><strong>Accept</strong> — records their approval and marks the estimate Accepted.</li>
        <li><strong>Reject</strong> — lets them decline with an optional message.</li>
        <li><strong>Download PDF</strong> — save a copy of the estimate.</li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        Opening the link also updates the estimate status from Sent to Viewed, so you know when
        the client has seen it.
      </p>
      <Screenshot label="Public estimate page with Accept and Reject buttons visible to the client" />

      {/* Statuses */}
      <h2 className="mt-10 text-xl font-bold">Estimate statuses</h2>
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

      {/* Converting */}
      <h2 className="mt-10 text-xl font-bold">Converting to an invoice</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Once the status is <strong>Accepted</strong>, open the estimate and click{' '}
        <strong>Convert to Invoice</strong>. BillCraft creates a new invoice pre-filled with all
        the line items, client details, currency, tax, and discount from the estimate. Review it,
        adjust the due date if needed, and send it — no re-entering data.
      </p>
      <Screenshot label="Accepted estimate detail page with Convert to Invoice button highlighted" />

      {/* Related */}
      <div className="mt-10 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">Related articles</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li><Link href="/docs/invoices" className="text-[#1D8CFF] hover:underline">Creating and sending invoices →</Link></li>
          <li><Link href="/docs/payments" className="text-[#1D8CFF] hover:underline">Recording payments →</Link></li>
        </ul>
      </div>
    </>
  )
}
