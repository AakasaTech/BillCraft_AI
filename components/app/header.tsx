'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { MobileSidebarContent } from './sidebar'
import { UserNav } from './user-nav'

interface HeaderProps {
  orgName: string
  userName: string
  userEmail: string
  userInitials: string
}

export function Header({ orgName, userName, userEmail, userInitials }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile nav on navigation
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <MenuIcon className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 p-0" showClose={false}>
          <MobileSidebarContent orgName={orgName} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <UserNav name={userName} email={userEmail} initials={userInitials} />
    </header>
  )
}
