'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PortalLoginProps {
  token:    string
  orgName:  string
  logoUrl:  string | null
}

type Step = 'email' | 'verify'

export function PortalLogin({ token, orgName, logoUrl }: PortalLoginProps) {
  const router = useRouter()
  const [step,    setStep]    = useState<Step>('email')
  const [email,   setEmail]   = useState('')
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${token}/send-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setStep('verify')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${token}/verify-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Incorrect code.'); return }
      // Cookie is now set — refresh to load the portal
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Org branding */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={orgName} className="h-12 w-auto max-w-[150px] object-contain" />
          )}
          <div>
            <p className="text-lg font-bold">{orgName}</p>
            <p className="text-sm text-muted-foreground">Client Portal</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          {step === 'email' ? (
            <>
              <div className="mb-6 flex flex-col items-center gap-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-xl font-bold">Sign in to your portal</h1>
                <p className="text-sm text-muted-foreground">
                  Enter the email address your invoices are sent to.
                </p>
              </div>

              <form onSubmit={sendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null) }}
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send verification code
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center gap-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-xl font-bold">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to <strong>{email}</strong>.
                  <br />It expires in 15 minutes.
                </p>
              </div>

              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    maxLength={6}
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(null) }}
                    required
                    autoFocus
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify and sign in
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => { setStep('email'); setCode(''); setError(null) }}
                >
                  Use a different email
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by BillCraft AI
        </p>
      </div>
    </div>
  )
}
