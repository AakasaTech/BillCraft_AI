'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, ExternalLink, Loader2, Mail, XCircle } from 'lucide-react'
import {
  saveEmailProviderCredentialsAction,
  disconnectEmailProviderAction,
  setActiveSenderAction,
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

type SenderChoice = 'default' | EmailConnectionProvider

interface EmailConnectionsProps {
  canManage:            boolean
  activeProvider:       EmailConnectionProvider | null
  defaultSenderAddress: string
  connections:          ConnectionRow[]
}

const PROVIDER_LABEL: Record<EmailConnectionProvider, string> = {
  google:    'Google Workspace',
  microsoft: 'Microsoft 365 / Azure',
}

export function EmailConnections({ canManage, activeProvider, defaultSenderAddress, connections }: EmailConnectionsProps) {
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

      <ActiveSenderSelector
        activeProvider={activeProvider}
        defaultSenderAddress={defaultSenderAddress}
        google={google}
        microsoft={microsoft}
        canManage={canManage}
      />

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

interface ActiveSenderSelectorProps {
  activeProvider:       EmailConnectionProvider | null
  defaultSenderAddress: string
  google:               ConnectionRow | undefined
  microsoft:            ConnectionRow | undefined
  canManage:            boolean
}

function ActiveSenderSelector({ activeProvider, defaultSenderAddress, google, microsoft, canManage }: ActiveSenderSelectorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingChoice, setPendingChoice] = useState<SenderChoice | null>(null)

  const current: SenderChoice = activeProvider ?? 'default'

  const options: Array<{ choice: SenderChoice; label: string; address: string; available: boolean; unavailableReason?: string }> = [
    { choice: 'default', label: 'BillCraft default', address: defaultSenderAddress, available: true },
    {
      choice: 'google', label: 'Google Workspace',
      address: google?.connected_email ?? 'org_common_name@yourcompany.com',
      available: google?.status === 'connected',
      unavailableReason: 'Connect Google Workspace below to select it.',
    },
    {
      choice: 'microsoft', label: 'Microsoft 365 / Azure',
      address: microsoft?.connected_email ?? 'org_common_name@yourcompany.com',
      available: microsoft?.status === 'connected',
      unavailableReason: 'Connect Microsoft 365 below to select it.',
    },
  ]

  const handleSelect = (choice: SenderChoice) => {
    if (choice === current || isPending) return
    setPendingChoice(choice)
    startTransition(async () => {
      const result = await setActiveSenderAction(choice)
      if (result?.error) toast.error(result.error)
      else { toast.success('Active sender updated.'); router.refresh() }
      setPendingChoice(null)
    })
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-6">
      <div>
        <p className="text-sm font-semibold">Active sender</p>
        <p className="text-xs text-muted-foreground">
          Choose which address client-facing emails (invoices, estimates, proformas, reminders) send from.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(opt => {
          const isSelected = current === opt.choice
          const isBusy = isPending && pendingChoice === opt.choice
          return (
            <button
              key={opt.choice}
              type="button"
              disabled={!canManage || !opt.available || isPending}
              onClick={() => handleSelect(opt.choice)}
              title={!opt.available ? opt.unavailableReason : undefined}
              className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              } ${!opt.available ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-xs font-semibold">{opt.label}</span>
                {isBusy ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : isSelected ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : null}
              </span>
              <span className="truncate text-xs text-muted-foreground">{opt.address}</span>
              {!opt.available && opt.choice !== 'default' && (
                <span className="text-[11px] text-muted-foreground">Not connected</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
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
