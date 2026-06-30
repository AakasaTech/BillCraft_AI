import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/app_icon.png" alt="" aria-hidden="true" className="h-8 w-auto" />
            <span className="text-lg font-bold tracking-tight text-foreground">BillCraft AI</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/#features"     className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</Link>
            <Link href="/#pricing"      className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-muted-foreground hover:text-foreground transition-colors sm:block">
              Sign in
            </Link>
            <Link href="/register" className="bc-btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white">
              Start free trial
            </Link>
          </div>
        </nav>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/app_icon.png" alt="" aria-hidden="true" className="h-7 w-auto" />
            <span className="text-base font-bold text-foreground">BillCraft AI</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BillCraft AI. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
