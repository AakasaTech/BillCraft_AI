'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen, Zap, FileText, ClipboardList, RefreshCw,
  CreditCard, TrendingDown, Sparkles, Bell, Send, HelpCircle,
} from 'lucide-react'

const NAV = [
  { href: '/docs',                          label: 'Overview',              icon: BookOpen },
  { href: '/docs/getting-started',          label: 'Getting Started',       icon: Zap },
  { href: '/docs/invoices',                 label: 'Invoices',              icon: FileText },
  { href: '/docs/estimates',                label: 'Estimates',             icon: ClipboardList },
  { href: '/docs/recurring-billing',        label: 'Recurring Billing',     icon: RefreshCw },
  { href: '/docs/payments',                 label: 'Payments',              icon: CreditCard },
  { href: '/docs/expenses',                 label: 'Expenses',              icon: TrendingDown },
  { href: '/docs/ai-features',              label: 'AI Features',           icon: Sparkles },
  { href: '/docs/notifications-and-email',  label: 'Email & Notifications', icon: Bell },
  { href: '/docs/custom-email-sending',     label: 'Custom Email Sending',  icon: Send },
  { href: '/docs/faq',                      label: 'FAQ',                   icon: HelpCircle },
]

export default function DocsSidebar() {
  const pathname = usePathname()
  return (
    <nav aria-label="Documentation navigation">
      <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Documentation
      </p>
      <ul className="space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== '/docs' && pathname.startsWith(href))
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-[#1D8CFF]/10 font-medium text-[#1D8CFF]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
