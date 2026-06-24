import {
  FilePlus, Send, Eye, Bell, Mail, CreditCard, CheckCircle2, XCircle, Ban,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, EmailLog, Payment } from '@/types/database'

interface TimelineEvent {
  id:          string
  date:        string
  icon:        React.ElementType
  iconColor:   string
  title:       string
  subtitle?:   string
}

function buildEvents(
  invoice:   Invoice,
  emails:    EmailLog[],
  payments:  Payment[],
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Invoice created
  events.push({
    id:        `created-${invoice.id}`,
    date:      invoice.created_at,
    icon:      FilePlus,
    iconColor: 'text-muted-foreground',
    title:     'Invoice created',
    subtitle:  `Draft · ${invoice.invoice_number}`,
  })

  // Sent at — only show if no email_logs (email logs are the authoritative record)
  const hasInvoiceEmail = emails.some((e) => !e.subject.toLowerCase().includes('reminder'))
  if (invoice.sent_at && !hasInvoiceEmail) {
    events.push({
      id:        `sent-${invoice.id}`,
      date:      invoice.sent_at,
      icon:      Send,
      iconColor: 'text-primary',
      title:     'Invoice sent',
    })
  }

  // Viewed
  if (invoice.viewed_at) {
    events.push({
      id:        `viewed-${invoice.id}`,
      date:      invoice.viewed_at,
      icon:      Eye,
      iconColor: 'text-blue-500',
      title:     'Invoice viewed by client',
    })
  }

  // Email log entries
  for (const email of emails) {
    const isReminder = email.subject.toLowerCase().includes('reminder')
    events.push({
      id:        `email-${email.id}`,
      date:      email.sent_at ?? email.created_at,
      icon:      isReminder ? Bell : Mail,
      iconColor: isReminder ? 'text-amber-500' : 'text-primary',
      title:     isReminder ? 'Payment reminder sent' : 'Invoice emailed to client',
      subtitle:  email.to_email,
    })
  }

  // Payments
  for (const payment of payments) {
    events.push({
      id:        `payment-${payment.id}`,
      date:      payment.payment_date + 'T12:00:00Z',
      icon:      CreditCard,
      iconColor: 'text-green-600',
      title:     `Payment received · ${formatCurrency(payment.amount, payment.currency)}`,
      subtitle:  payment.payment_method.replace(/_/g, ' '),
    })
  }

  // Paid
  if (invoice.paid_at && invoice.status === 'paid') {
    events.push({
      id:        `paid-${invoice.id}`,
      date:      invoice.paid_at,
      icon:      CheckCircle2,
      iconColor: 'text-green-600',
      title:     'Invoice fully paid',
    })
  }

  // Voided / Cancelled
  if (invoice.status === 'void') {
    events.push({
      id:        `void-${invoice.id}`,
      date:      invoice.updated_at,
      icon:      Ban,
      iconColor: 'text-muted-foreground',
      title:     'Invoice voided',
    })
  }
  if (invoice.status === 'cancelled') {
    events.push({
      id:        `cancelled-${invoice.id}`,
      date:      invoice.updated_at,
      icon:      XCircle,
      iconColor: 'text-muted-foreground',
      title:     'Invoice cancelled',
    })
  }

  // Sort chronologically ascending
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

interface InvoiceTimelineProps {
  invoice:  Invoice
  emails:   EmailLog[]
  payments: Payment[]
}

export function InvoiceTimeline({ invoice, emails, payments }: InvoiceTimelineProps) {
  const events = buildEvents(invoice, emails, payments)
  if (events.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
        Activity
      </p>
      <ol className="relative border-l border-border ml-2 space-y-5">
        {events.map((ev) => {
          const Icon = ev.icon
          return (
            <li key={ev.id} className="ml-5">
              <span className="absolute -left-[18px] flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm">
                <Icon className={`h-4 w-4 ${ev.iconColor}`} />
              </span>
              <div>
                <p className="text-sm font-medium leading-tight">{ev.title}</p>
                {ev.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{ev.subtitle}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(ev.date, 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
