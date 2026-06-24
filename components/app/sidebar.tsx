'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Settings, CreditCard, Zap, BarChart2, RefreshCw, Wallet, LayoutTemplate, Package, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients',   label: 'Clients',   icon: Users },
  { href: '/invoices',  label: 'Invoices',  icon: FileText },
  { href: '/estimates', label: 'Estimates', icon: ClipboardList },
  { href: '/products',  label: 'Products',  icon: Package },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/recurring', label: 'Recurring', icon: RefreshCw },
  { href: '/expenses',  label: 'Expenses',  icon: Wallet },
  { href: '/reports',   label: 'Reports',   icon: BarChart2 },
  { href: '/settings',  label: 'Settings',  icon: Settings },
  { href: '/billing',   label: 'Billing',   icon: CreditCard },
]

interface SidebarProps {
  orgName: string
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 space-y-0.5 p-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar({ orgName }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Zap className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-sm truncate">{orgName}</span>
      </div>
      <NavLinks pathname={pathname} />
      <div className="border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">BillCraft AI</p>
      </div>
    </aside>
  )
}

export function MobileSidebarContent({ orgName }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Zap className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-sm truncate">{orgName}</span>
      </div>
      <NavLinks pathname={pathname} />
    </div>
  )
}
