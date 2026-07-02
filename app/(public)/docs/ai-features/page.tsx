import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'AI Features — BillCraft AI Docs',
  description:
    'Use AI to generate invoices from a single sentence and draft personalised payment reminder messages in BillCraft AI.',
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

export default function AiFeaturesPage() {
  return (
    <>
      <DocsBreadcrumb crumbs={[{ label: 'AI Features' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">AI Features</h1>
      <p className="mt-3 text-muted-foreground">
        BillCraft AI uses GPT-4o to automate two of the most time-consuming parts of billing:
        creating invoices and writing follow-up emails.
      </p>
      <Callout>
        <strong>Pro and Agency plans only.</strong> AI features require a Pro or Agency
        subscription.
      </Callout>

      {/* AI invoice generation */}
      <h2 className="mt-10 text-xl font-bold">AI invoice generation</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Instead of filling in every field manually, describe the work in plain language and let
        BillCraft build the invoice for you.
      </p>

      <h3 className="mt-6 text-base font-semibold">How to use it</h3>
      <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
        <li>Go to <strong>Invoices → New Invoice</strong>.</li>
        <li>
          Type a description of the work in the AI input box. Be as specific or as brief as you
          like — the AI handles ambiguity.
        </li>
        <li>Click <strong>Generate Invoice</strong>.</li>
        <li>
          BillCraft fills in the client, line items, amounts, currency, tax type, due date, and
          payment terms. Review the result and make any changes before saving.
        </li>
      </ol>
      <Screenshot label="New invoice form with the AI description box filled in and the generated line items below it" />

      <h3 className="mt-8 text-base font-semibold">Example prompts</h3>
      <div className="mt-3 space-y-3">
        {[
          'Bill Acme Corp 3 days of consulting at $800/day, net 14, 20% VAT',
          'Invoice TechStartup Ltd for 40 hours of design work at £85/hour, due in 30 days, no tax',
          'Monthly retainer for GlobalCo – $2,500 for April, USD, net 7',
          'Web development for SmallBiz: 15 hours @ €90/hr, plus €200 for hosting setup, 19% VAT, net 30',
        ].map((prompt) => (
          <div
            key={prompt}
            className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground font-mono"
          >
            {prompt}
          </div>
        ))}
      </div>

      <h3 className="mt-8 text-base font-semibold">What the AI extracts</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        From your description, the AI attempts to identify:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li><strong>Client name</strong> — matched against your existing clients or used to suggest a new one.</li>
        <li><strong>Line items</strong> — description, quantity, and unit price for each service.</li>
        <li><strong>Currency</strong> — detected from symbols ($, €, £, etc.) or country context.</li>
        <li><strong>Tax type and rate</strong> — VAT, GST, Sales Tax, or None, with the percentage.</li>
        <li><strong>Due date / payment terms</strong> — "net 14", "due in 30 days", specific dates.</li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        Each extracted field shows a confidence indicator. Low-confidence fields are highlighted so
        you know what to double-check before sending.
      </p>
      <Screenshot label="Generated invoice with confidence indicators on extracted fields" />

      {/* AI reminder drafts */}
      <h2 className="mt-10 text-xl font-bold">AI-drafted payment reminders</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        When sending a payment reminder, you can ask BillCraft to draft the email body for you.
        The AI writes a professional, personalised reminder message based on:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li>The client's name and your business name.</li>
        <li>The invoice number, total amount, and currency.</li>
        <li>The due date and how many days overdue the invoice is (if applicable).</li>
        <li>The payment instructions from the invoice.</li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        You can edit the drafted message before sending, or discard it and write your own.
      </p>
      <Screenshot label="Send reminder modal showing AI-drafted email body with an Edit button" />

      {/* Tips */}
      <h2 className="mt-10 text-xl font-bold">Tips for better results</h2>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li>Include the client name, service description, amounts, and any tax or payment terms in your prompt.</li>
        <li>Be explicit about currency — "€200" is clearer than "200".</li>
        <li>Always review extracted fields before sending, especially tax and due date.</li>
        <li>If the AI misidentifies a client, you can reassign from the client dropdown after generation.</li>
      </ul>

      {/* Related */}
      <div className="mt-10 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">Related articles</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li><Link href="/docs/invoices" className="text-[#1D8CFF] hover:underline">Creating and sending invoices →</Link></li>
          <li><Link href="/docs/payments" className="text-[#1D8CFF] hover:underline">Payment reminders →</Link></li>
        </ul>
      </div>
    </>
  )
}
