'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, MenuIcon, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { MobileSidebarContent } from './sidebar'
import { UserNav } from './user-nav'

interface HeaderProps {
  orgName: string
  userName: string
  userEmail: string
  userInitials: string
  isTrading?: boolean
}

export function Header({ orgName, userName, userEmail, userInitials, isTrading = false }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (q) router.push(`/invoices?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      {/* Mobile menu trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <MenuIcon className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0" showClose={false}>
          <MobileSidebarContent orgName={orgName} isTrading={isTrading} />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-xs">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="pl-8 h-8 bg-muted border-0 text-sm focus-visible:ring-1 focus-visible:bg-background"
          />
        </div>
      </form>

      <div className="flex-1" />

      {/* Right-side actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <Button
          asChild
          size="sm"
          className="bc-btn-primary hidden sm:flex h-8 gap-1.5 text-white border-0 text-xs font-semibold"
        >
          <a href="/invoices/new">
            <Plus className="h-3.5 w-3.5" />
            New Invoice
          </a>
        </Button>

        <UserNav name={userName} email={userEmail} initials={userInitials} />
      </div>
    </header>
  )
}
