import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'Recurring Billing — BillCraft AI Docs',
  description:
    'Automate retainer and subscription invoices on weekly, monthly, or custom schedules with BillCraft AI recurring billing.',
}

function Screenshot({ label }: { label: string }) {
  return (
    <div className="my-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      [SCREENSHOT: {label}]
    </div>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-[#1D8CFF]/20 bg-[#1D8CFF]/5 px-4 py-3 text-sm text-muted-foreground">
      {children}
    </div>
  )
}

export default function RecurringBillingPage() {
  return (
    <>
      <DocsBreadcrumb crumbs={[{ label: 'Recurring Billing' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">Recurring Billing</h1>
      <p className="mt-3 text-muted-foreground">
        Set up a recurring invoice schedule so BillCraft automatically creates a new invoice draft
        each billing cycle — perfect for retainers, subscriptions, and regular service fees.
      </p>
      <Callout>
        <strong>Pro and Agency plans only.</strong> Recurring billing requires a Pro or Agency subscription.
      </Callout>

      {/* How it works */}
      <h2 className="mt-10 text-xl font-bold">How recurring billing works</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        When a recurring schedule runs, BillCraft creates a new invoice in{' '}
        <strong>Draft</strong> status — it does <em>not</em> auto-send it. You review and send
        each draft manually, giving you a chance to adjust details before the client receives
        anything. This also means no invoices are accidentally emailed if you need to pause or
        modify a schedule.
      </p>

      {/* Creating */}
      <h2 className="mt-10 text-xl font-bold">Creating a recurring invoice</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Go to <strong>Recurring → New Recurring Invoice</strong>. Fill in:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li><strong>Client</strong> — who this recurring invoice is for.</li>
        <li><strong>Frequency</strong> — how often to generate a new draft: weekly, bi-weekly, monthly, quarterly, or annually.</li>
        <li><strong>Start date</strong> — the date the first draft should be created.</li>
        <li><strong>End date (optional)</strong> — leave blank for an ongoing schedule, or set a date to stop automatically.</li>
        <li><strong>Line items</strong> — the items that will appear on every generated invoice. These are copied exactly each cycle.</li>
        <li><strong>Currency, tax, discount</strong> — same options as regular invoices; applied to every generated invoice.</li>
        <li><strong>Payment terms</strong> — e.g. Net 14, Net 30. The due date on each draft is calculated from the generation date using these terms.</li>
        <li><strong>Payment instructions</strong> — optionally load from a saved template in <strong>Settings → Organisation</strong>.</li>
      </ul>
      <Screenshot label="New recurring invoice form showing frequency selector, start date, line items, and payment instructions fields" />

      {/* Managing */}
      <h2 className="mt-10 text-xl font-bold">Managing schedules</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The <strong>Recurring</strong> list shows all your active and paused schedules. From the
        schedule detail page you can:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li><strong>Pause</strong> — temporarily stop generating drafts without deleting the schedule.</li>
        <li><strong>Resume</strong> — re-activate a paused schedule.</li>
        <li><strong>Edit</strong> — update line items, payment terms, or payment instructions. Changes apply to future drafts only, not already-generated invoices.</li>
        <li><strong>Delete</strong> — permanently remove the schedule. Already-generated invoices are not affected.</li>
      </ul>
      <Screenshot label="Recurring invoice detail page with Pause, Edit, and Delete actions" />

      {/* Generated invoices */}
      <h2 className="mt-10 text-xl font-bold">What happens each billing cycle</h2>
      <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
        <li>The schedule's next-run date arrives.</li>
        <li>BillCraft creates a new invoice draft pre-filled with the schedule's line items, client, currency, tax, discount, and payment instructions.</li>
        <li>The draft appears in your <strong>Invoices</strong> list with status Draft.</li>
        <li>You review the draft, make any adjustments (e.g. change a quantity), and click <strong>Send Invoice</strong>.</li>
      </ol>
      <Screenshot label="Invoices list showing a newly generated recurring draft with a 'Recurring' badge" />

      {/* Related */}
      <div className="mt-10 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">Related articles</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li><Link href="/docs/invoices" className="text-[#1D8CFF] hover:underline">Creating and sending invoices →</Link></li>
          <li><Link href="/docs/payments" className="text-[#1D8CFF] hover:underline">Recording payments and reminders →</Link></li>
          <li><Link href="/docs/ai-features" className="text-[#1D8CFF] hover:underline">AI invoice generation →</Link></li>
        </ul>
      </div>
    </>
  )
}
