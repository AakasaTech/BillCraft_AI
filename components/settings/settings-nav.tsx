'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Building2, Key, Mail, Send, ShieldCheck, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/settings/organization',    label: 'Organization',     icon: Building2  },
  { href: '/settings/profile',         label: 'Profile',          icon: User       },
  { href: '/settings/team',            label: 'Team',             icon: Users      },
  { href: '/settings/notifications',   label: 'Notifications',    icon: Bell       },
  { href: '/settings/email-templates', label: 'Email templates',  icon: Mail       },
  { href: '/settings/email',           label: 'Email sending',    icon: Send       },
  { href: '/settings/api',             label: 'API keys',         icon: Key        },
  { href: '/settings/audit',           label: 'Audit log',        icon: ShieldCheck },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 md:flex-col">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === href
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
