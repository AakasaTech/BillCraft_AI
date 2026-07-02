import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'Payments — BillCraft AI Docs',
  description:
    'Record received payments, understand invoice statuses, and configure automated payment reminders in BillCraft AI.',
}

function Screenshot({ label }: { label: string }) {
  return (
    <div className="my-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      [SCREENSHOT: {label}]
    </div>
  )
}

const REMINDER_OFFSETS = [
  { label: '7 days before due',  offset: '-7' },
  { label: '3 days before due',  offset: '-3' },
  { label: '1 day before due',   offset: '-1' },
  { label: 'On the due date',    offset: '0' },
  { label: '1 day overdue',      offset: '+1' },
  { label: '3 days overdue',     offset: '+3' },
  { label: '7 days overdue',     offset: '+7' },
  { label: '14 days overdue',    offset: '+14' },
  { label: '30 days overdue',    offset: '+30' },
]

export default function PaymentsPage() {
  return (
    <>
      <DocsBreadcrumb crumbs={[{ label: 'Payments' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">Payments</h1>
      <p className="mt-3 text-muted-foreground">
        BillCraft tracks what's owed and what's been paid. Record payments as they come in, and
        set up automated reminders to get paid faster without chasing clients manually.
      </p>

      {/* How payments work */}
      <h2 className="mt-10 text-xl font-bold">How payments work</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        BillCraft does not process card payments — instead, you receive payment through your own
        bank, PayPal, or any payment link you provide to your clients. You then record the payment
        in BillCraft to keep your books accurate. Your bank details or payment link go in the{' '}
        <strong>Payment Instructions</strong> field on each invoice and in{' '}
        <strong>Settings → Organisation</strong> as templates.
      </p>

      {/* Recording */}
      <h2 className="mt-10 text-xl font-bold">Recording a payment</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Open the invoice and click <strong>Record Payment</strong>. Enter:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li><strong>Amount</strong> — the amount received. Can be less than the invoice total for partial payments.</li>
        <li><strong>Date</strong> — the date you received the payment.</li>
        <li><strong>Note (optional)</strong> — a reference, transaction ID, or memo.</li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        After recording:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li>If the full amount is covered → status changes to <strong>Paid</strong>.</li>
        <li>If only a partial amount is paid → status changes to <strong>Partial</strong> and the remaining balance is shown.</li>
      </ul>
      <Screenshot label="Record Payment modal with amount, date, and optional note fields" />

      {/* Payment history */}
      <h2 className="mt-10 text-xl font-bold">Payment history</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Every invoice page shows a full payment history — each recorded payment with its amount,
        date, and note. You can delete a payment record if it was entered in error.
      </p>
      <Screenshot label="Invoice detail page showing payment history list with amounts and dates" />

      {/* Reminders */}
      <h2 className="mt-10 text-xl font-bold">Payment reminders</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Send a reminder email to the client directly from the invoice page by clicking{' '}
        <strong>Send Reminder</strong>. Choose from the available timing offsets — or set up
        automated reminders to run without manual action.
      </p>
      <Screenshot label="Send Reminder button on invoice page with timing selector" />

      <h3 className="mt-8 text-base font-semibold">Manual reminders</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        From any sent invoice, click <strong>Send Reminder</strong> and choose when relative to
        the due date the reminder applies. The email is sent immediately. You can optionally use
        the AI to draft a personalised reminder message — see{' '}
        <Link href="/docs/ai-features" className="text-[#1D8CFF] hover:underline">AI Features</Link>.
      </p>

      <h3 className="mt-8 text-base font-semibold">Automated reminders</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        BillCraft can automatically send reminder emails on a schedule relative to each invoice's
        due date. The available trigger points are:
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {REMINDER_OFFSETS.map(({ label, offset }) => (
          <span
            key={offset}
            className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Automated reminders require a cron job configured in your deployment environment. Your
        system administrator can set this up — see the deployment docs for details.
      </p>

      {/* Related */}
      <div className="mt-10 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">Related articles</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li><Link href="/docs/invoices" className="text-[#1D8CFF] hover:underline">Invoice statuses explained →</Link></li>
          <li><Link href="/docs/ai-features" className="text-[#1D8CFF] hover:underline">AI-drafted reminder messages →</Link></li>
          <li><Link href="/docs/notifications-and-email" className="text-[#1D8CFF] hover:underline">Email & notifications →</Link></li>
        </ul>
      </div>
    </>
  )
}
