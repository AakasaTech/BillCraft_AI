import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'Email & Notifications — BillCraft AI Docs',
  description:
    'Learn what emails BillCraft AI sends to your clients, how to set your sender address, and how automated reminders work.',
}

function Screenshot({ label }: { label: string }) {
  return (
    <div className="my-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      [SCREENSHOT: {label}]
    </div>
  )
}

const EMAILS = [
  {
    trigger: 'Send Invoice',
    recipient: 'Client',
    subject: 'Invoice [#] from [Your Business]',
    content: 'PDF invoice attached; link to view online.',
  },
  {
    trigger: 'Send Estimate',
    recipient: 'Client',
    subject: 'Estimate [#] from [Your Business]',
    content: 'PDF estimate attached; link to accept or reject.',
  },
  {
    trigger: 'Send Reminder',
    recipient: 'Client',
    subject: 'Reminder: Invoice [#] from [Your Business]',
    content: 'Payment reminder with invoice details and payment instructions.',
  },
  {
    trigger: 'Automated reminder (cron)',
    recipient: 'Client',
    subject: 'Reminder: Invoice [#] from [Your Business]',
    content: 'Same as manual reminder — sent automatically on the configured schedule.',
  },
]

export default function NotificationsAndEmailPage() {
  return (
    <>
      <DocsBreadcrumb crumbs={[{ label: 'Email & Notifications' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">Email & Notifications</h1>
      <p className="mt-3 text-muted-foreground">
        BillCraft AI sends transactional emails on your behalf when you send invoices, estimates,
        and payment reminders. Here's what gets sent, how the sender address works, and how to
        configure automated reminders.
      </p>

      {/* Sender address */}
      <h2 className="mt-10 text-xl font-bold">Sender address</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        All emails are sent from an address at{' '}
        <code className="rounded bg-muted px-1 text-xs">billcraft.aakasa.dev</code>. The prefix
        of your sender address is configured by the platform administrator. If you receive
        bounces or delivery issues, contact your administrator.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        The email <em>display name</em> shown to clients is your business name from{' '}
        <strong>Settings → Organisation</strong>. Clients see something like "Acme Studio
        &lt;invoices@billcraft.aakasa.dev&gt;".
      </p>

      {/* What gets sent */}
      <h2 className="mt-10 text-xl font-bold">Emails BillCraft sends</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
              <th className="px-4 py-3">Triggered by</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Content</th>
            </tr>
          </thead>
          <tbody>
            {EMAILS.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{row.trigger}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.recipient}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.subject}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CC addresses */}
      <h2 className="mt-10 text-xl font-bold">CC addresses</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        You can add CC email addresses to each client record under <strong>Clients → [Client] →
        Edit</strong>. Any address listed there will automatically receive a copy of every invoice
        and reminder sent to that client. This is useful for adding a client's accounts payable
        team or a project manager.
      </p>
      <Screenshot label="Client edit form showing CC emails field with multiple addresses" />

      {/* Automated reminders */}
      <h2 className="mt-10 text-xl font-bold">Automated reminders</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        BillCraft can send reminder emails automatically based on each invoice's due date — no
        manual action required. Automated reminders are triggered by a scheduled cron job that
        calls BillCraft's reminder endpoint daily at a time configured by your administrator.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Each reminder is sent only once per invoice per trigger point (e.g. "7 days before due").
        If an invoice is already paid or cancelled when the cron runs, no email is sent.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        For the full list of available trigger points and cron setup instructions, see{' '}
        <Link href="/docs/payments" className="text-[#1D8CFF] hover:underline">Payments</Link>.
      </p>

      {/* Invoice view tracking */}
      <h2 className="mt-10 text-xl font-bold">Invoice view tracking</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        When a client opens the invoice link from an email, the invoice status automatically
        updates from <strong>Sent</strong> to <strong>Viewed</strong>. You'll see this reflected
        in your invoices list and on the invoice detail page — no setup required.
      </p>

      {/* Related */}
      <div className="mt-10 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">Related articles</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li><Link href="/docs/payments" className="text-[#1D8CFF] hover:underline">Payment reminders and timing →</Link></li>
          <li><Link href="/docs/ai-features" className="text-[#1D8CFF] hover:underline">AI-drafted reminder messages →</Link></li>
          <li><Link href="/docs/invoices" className="text-[#1D8CFF] hover:underline">Sending invoices →</Link></li>
        </ul>
      </div>
    </>
  )
}
