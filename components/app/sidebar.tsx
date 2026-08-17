'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Settings, CreditCard,
  BarChart2, RefreshCw, Wallet, LayoutTemplate,
  Package, ClipboardList, ChevronRight, HelpCircle, Ship,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Nav structure ─────────────────────────────────────────────────────────────

function buildNavGroups(isTrading: boolean) {
  return [
    {
      label: null,
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Billing',
      items: [
        { href: '/invoices',  label: 'Invoices',  icon: FileText      },
        ...(isTrading ? [{ href: '/proformas', label: 'Proformas', icon: Ship }] : []),
        { href: '/estimates', label: 'Quotes',    icon: ClipboardList  },
        { href: '/clients',   label: 'Customers', icon: Users          },
        { href: '/expenses',  label: 'Expenses',  icon: Wallet         },
      ],
    },
  {
    label: 'Manage',
    items: [
      { href: '/products',  label: 'Products',  icon: Package        },
      { href: '/templates', label: 'Templates', icon: LayoutTemplate },
      { href: '/recurring', label: 'Recurring', icon: RefreshCw      },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/reports',  label: 'Reports',  icon: BarChart2    },
      { href: '/settings', label: 'Settings', icon: Settings     },
      { href: '/billing',  label: 'Billing',  icon: CreditCard   },
      { href: '/help',     label: 'Help',     icon: HelpCircle   },
    ],
  },
  ]
}

// ── Nav link ──────────────────────────────────────────────────────────────────

function NavLink({
  href, label, icon: Icon, active,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-[#1D8CFF] text-white shadow-lg shadow-blue-500/25'
          : 'text-white/55 hover:bg-white/[0.08] hover:text-white/90',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? '' : 'group-hover:scale-110 transition-transform')} />
      <span className="flex-1 truncate">{label}</span>
      {active && <ChevronRight className="h-3 w-3 opacity-50" />}
    </Link>
  )
}

// ── Nav content (shared by desktop sidebar + mobile sheet) ────────────────────

function NavContent({ pathname, isTrading }: { pathname: string; isTrading: boolean }) {
  const navGroups = buildNavGroups(isTrading)
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {navGroups.map((group, gi) => (
        <div key={gi} className="space-y-0.5">
          {group.label && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              {group.label}
            </p>
          )}
          {group.items.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <NavLink key={href} href={href} label={label} icon={icon} active={active} />
            )
          })}
        </div>
      ))}
    </nav>
  )
}

// ── Brand header ──────────────────────────────────────────────────────────────

function BrandHeader() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
      <img src="/app_icon.png" alt="BillCraft AI" className="h-9 w-auto shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-white tracking-tight">
          BillCraft AI
        </p>
        <p className="truncate text-[10px] leading-tight text-white/35">
          Intelligent Billing
        </p>
      </div>
    </div>
  )
}

// ── Sidebar footer ────────────────────────────────────────────────────────────

function SidebarFooter() {
  return (
    <div className="shrink-0 border-t border-white/10 px-5 py-4">
      <p className="text-[10px] text-white/20">© 2026 BillCraft AI</p>
    </div>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function Sidebar({ orgName: _, isTrading = false }: { orgName: string; isTrading?: boolean }) {
  const pathname = usePathname()

  return (
    <aside className="bc-sidebar hidden md:flex w-64 shrink-0 flex-col">
      <BrandHeader />
      <NavContent pathname={pathname} isTrading={isTrading} />
      <SidebarFooter />
    </aside>
  )
}

// ── Mobile sidebar (used inside Sheet) ───────────────────────────────────────

export function MobileSidebarContent({ orgName: _, isTrading = false }: { orgName: string; isTrading?: boolean }) {
  const pathname = usePathname()

  return (
    <div className="bc-sidebar flex h-full flex-col">
      <BrandHeader />
      <NavContent pathname={pathname} isTrading={isTrading} />
    </div>
  )
}
