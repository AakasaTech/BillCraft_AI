import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'Expenses — BillCraft AI Docs',
  description:
    'Log and categorise business expenses in BillCraft AI to track them alongside your invoiced revenue.',
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

export default function ExpensesPage() {
  return (
    <>
      <DocsBreadcrumb crumbs={[{ label: 'Expenses' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">Expenses</h1>
      <p className="mt-3 text-muted-foreground">
        Log your business expenses in BillCraft AI and track them alongside your invoiced revenue
        for a clearer picture of your business finances.
      </p>
      <Callout>
        <strong>Pro and Agency plans only.</strong> The Expenses feature requires a Pro or Agency
        subscription.
      </Callout>

      {/* Logging */}
      <h2 className="mt-10 text-xl font-bold">Logging an expense</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Go to <strong>Expenses → New Expense</strong> and fill in:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li><strong>Description</strong> — a short note about what the expense was for.</li>
        <li><strong>Amount</strong> — the amount spent.</li>
        <li><strong>Currency</strong> — the currency the expense was incurred in.</li>
        <li><strong>Category</strong> — choose from categories like Software, Travel, Equipment, Marketing, Contractor, or Other.</li>
        <li><strong>Date</strong> — when the expense occurred.</li>
        <li><strong>Notes (optional)</strong> — supplier name, receipt reference, or any additional detail.</li>
      </ul>
      <Screenshot label="New expense form with description, amount, category dropdown, and date fields" />

      {/* Categories */}
      <h2 className="mt-10 text-xl font-bold">Categories</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Categorising expenses lets you filter and group them in the expenses list so you can see
        at a glance where your money is going. Pick the category that best fits when logging each
        expense — or use Other if nothing fits.
      </p>

      {/* Viewing */}
      <h2 className="mt-10 text-xl font-bold">Viewing and filtering expenses</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The <strong>Expenses</strong> list shows all your logged expenses. You can filter by
        category and date range to narrow down to a specific period or cost type. The total for
        the current filter is shown at the top.
      </p>
      <Screenshot label="Expenses list filtered by category showing total amount for the filtered selection" />

      {/* Editing / deleting */}
      <h2 className="mt-10 text-xl font-bold">Editing and deleting expenses</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Click any expense in the list to open it. You can update any field or delete the record if
        it was logged in error. Deleted expenses are removed permanently.
      </p>

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
