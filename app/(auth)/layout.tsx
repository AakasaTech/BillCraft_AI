import { Zap } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold text-lg">
        <Zap className="h-5 w-5 text-primary" />
        BillCraft AI
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm">{children}</div>

      {/* Footer note */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
