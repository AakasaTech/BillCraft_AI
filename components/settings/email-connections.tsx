'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, ExternalLink, Loader2, Mail, XCircle } from 'lucide-react'
import {
  saveEmailProviderCredentialsAction,
  disconnectEmailProviderAction,
  setActiveEmailProviderAction,
} from '@/app/actions/email-connections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { EmailConnectionProvider } from '@/types/database'
import type { ConnectionRow } from '@/app/(app)/settings/email/page'

interface EmailConnectionsProps {
  canManage:      boolean
  activeProvider: EmailConnectionProvider | null
  connections:    ConnectionRow[]
}

const PROVIDER_LABEL: Record<EmailConnectionProvider, string> = {
  google:    'Google Workspace',
  microsoft: 'Microsoft 365 / Azure',
}

export function EmailConnections({ canManage, activeProvider, connections }: EmailConnectionsProps) {
  const router = useRouter()

  // The OAuth callback redirects back here with ?provider=&status=&message= —
  // read it once, toast, then strip the params so a refresh doesn't re-toast.
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const status   = params.get('status')
    const provider = params.get('provider') as EmailConnectionProvider | null
    const message  = params.get('message')
    if (!status) return

    if (status === 'connected' && provider) {
      toast.success(`${PROVIDER_LABEL[provider]} connected.`)
    } else if (status === 'error') {
      toast.error(message || 'Connection failed. Please try again.')
    }
    router.replace('/settings/email')
  }, [router])

  const google    = connections.find(c => c.provider === 'google')
  const microsoft = connections.find(c => c.provider === 'microsoft')

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Custom Email Sending</h1>
        <p className="text-sm text-muted-foreground">
          Connect your own Google Workspace or Microsoft 365 mailbox so invoices, estimates,
          proformas, and payment reminders send from your real business address instead of
          BillCraft&apos;s shared sender. Team invitations and portal login codes always use
          BillCraft&apos;s sender regardless of this setting.
        </p>
      </div>

      {!canManage && (
        <p className="text-sm text-muted-foreground">Only owners and admins can manage email connections.</p>
      )}

      <ProviderCard
        provider="google"
        connection={google}
        isActive={activeProvider === 'google'}
        canManage={canManage}
      />
      <ProviderCard
        provider="microsoft"
        connection={microsoft}
        isActive={activeProvider === 'microsoft'}
        canManage={canManage}
      />

      <p className="text-sm text-muted-foreground">
        Need help getting your Client ID and Secret?{' '}
        <Link href="/docs/custom-email-sending" target="_blank" className="text-[#1D8CFF] hover:underline">
          Step-by-step setup guide <ExternalLink className="inline h-3 w-3" />
        </Link>
      </p>
    </div>
  )
}

interface ProviderCardProps {
  provider:   EmailConnectionProvider
  connection: ConnectionRow | undefined
  isActive:   boolean
  canManage:  boolean
}

function ProviderCard({ provider, connection, isActive, canManage }: ProviderCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [clientId,     setClientId]     = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [tenantId,     setTenantId]     = useState('')

  const isConnected = connection?.status === 'connected'

  const handleConnect = () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error('Client ID and Client Secret are required.')
      return
    }
    startTransition(async () => {
      const result = await saveEmailProviderCredentialsAction(provider, {
        clientId, clientSecret, tenantId: provider === 'microsoft' ? tenantId : undefined,
      })
      if (result?.error) { toast.error(result.error); return }
      if (result?.authorizeUrl) window.location.href = result.authorizeUrl
    })
  }

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await disconnectEmailProviderAction(provider)
      if (result?.error) toast.error(result.error)
      else { toast.success(`${PROVIDER_LABEL[provider]} disconnected.`); router.refresh() }
    })
  }

  const handleMakeActive = () => {
    startTransition(async () => {
      const result = await setActiveEmailProviderAction(provider)
      if (result?.error) toast.error(result.error)
      else { toast.success(`${PROVIDER_LABEL[provider]} is now the active sender.`); router.refresh() }
    })
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{PROVIDER_LABEL[provider]}</p>
            {isConnected ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                Connected as {connection?.connected_email ?? 'unknown address'}
              </p>
            ) : connection?.status === 'error' ? (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                {connection.last_error ?? 'Connection failed'}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Not connected</p>
            )}
          </div>
        </div>
        {isConnected && isActive && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Active</span>
        )}
      </div>

      {canManage && (
        <>
          <Separator />

          {isConnected ? (
            <div className="flex flex-wrap items-center gap-2">
              {!isActive && (
                <Button size="sm" disabled={isPending} onClick={handleMakeActive}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Make active sender
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending}>Disconnect</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect {PROVIDER_LABEL[provider]}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Client-facing emails will fall back to BillCraft&apos;s shared sender until you reconnect.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Paste the credentials from your own {provider === 'google' ? 'Google Cloud' : 'Azure App Registration'}{' '}
                project — see the setup guide below. BillCraft never sees your mailbox password;
                this is an OAuth connection you can revoke at any time from{' '}
                {provider === 'google' ? 'Google Cloud Console' : 'the Azure/Entra portal'}.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Client ID</Label>
                  <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder={provider === 'google' ? '1234567890-abc.apps.googleusercontent.com' : 'Application (client) ID'} />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Secret</Label>
                  <Input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="••••••••••••" />
                </div>
                {provider === 'microsoft' && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Tenant ID <span className="text-muted-foreground">(optional — leave blank to allow any Microsoft account)</span></Label>
                    <Input value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="Directory (tenant) ID" />
                  </div>
                )}
              </div>
              <Button size="sm" disabled={isPending} onClick={handleConnect}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save &amp; Connect
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
