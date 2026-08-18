import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'

export const metadata: Metadata = {
  title: 'Custom Email Sending — BillCraft AI Docs',
  description:
    'Connect your own Google Workspace or Microsoft 365 mailbox so invoices, estimates, and reminders send from your real business address.',
}

function Screenshot({ label }: { label: string }) {
  return (
    <div className="my-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      [SCREENSHOT: {label}]
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <code className="block overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs">
      {children}
    </code>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D8CFF]/10 text-sm font-bold text-[#1D8CFF]">
        {n}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <div className="mt-1.5 space-y-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-billcraft-domain.com').replace(/\/+$/, '')
const GOOGLE_REDIRECT_URI    = `${APP_URL}/api/settings/email/google/callback`
const MICROSOFT_REDIRECT_URI = `${APP_URL}/api/settings/email/microsoft/callback`

export default function CustomEmailSendingPage() {
  return (
    <>
      <DocsBreadcrumb crumbs={[{ label: 'Custom Email Sending' }]} />

      <h1 className="text-3xl font-extrabold tracking-tight">Custom Email Sending</h1>
      <p className="mt-3 text-muted-foreground">
        By default, invoices, estimates, proformas, and payment reminders send from BillCraft&apos;s
        shared sender address. If you&apos;d rather your clients see emails coming from your own
        business address, you can connect a Google Workspace or Microsoft 365 mailbox under{' '}
        <strong>Settings → Email sending</strong>.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        This only affects client-facing documents. Team invitations and client portal login codes
        always send from BillCraft&apos;s sender, regardless of this setting.
      </p>

      {/* Why credentials are needed */}
      <h2 className="mt-10 text-xl font-bold">Why do I need to create my own app?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Rather than asking you to trust a shared, BillCraft-owned app with access to your mailbox,
        you register your own small OAuth application with Google or Microsoft — free, takes about
        five minutes — and BillCraft uses it only to request permission to send mail as you. You can
        revoke that permission at any time from your own Google Cloud or Azure account, without
        contacting BillCraft.
      </p>

      {/* Google Workspace */}
      <h2 className="mt-10 text-xl font-bold">Google Workspace setup</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        You&apos;ll need access to{' '}
        <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-[#1D8CFF] hover:underline">
          Google Cloud Console
        </a>{' '}
        with the Google account (or Workspace admin account) whose mailbox you want to connect.
      </p>

      <Step n={1} title="Create a Google Cloud project">
        <p>
          In Google Cloud Console, click the project dropdown at the top → <strong>New Project</strong>.
          Any name works — e.g. &quot;BillCraft Email&quot;.
        </p>
        <Screenshot label="Google Cloud Console — New Project dialog" />
      </Step>

      <Step n={2} title="Enable the Gmail API">
        <p>
          Go to <strong>APIs &amp; Services → Library</strong>, search for <strong>Gmail API</strong>,
          and click <strong>Enable</strong>.
        </p>
      </Step>

      <Step n={3} title="Configure the OAuth consent screen">
        <p>
          Go to <strong>APIs &amp; Services → OAuth consent screen</strong>. Choose{' '}
          <strong>Internal</strong> if you&apos;re on Google Workspace and only need your own
          organization to connect, or <strong>External</strong> for a personal Gmail account (in
          that case add your own email under <strong>Test users</strong> so Google doesn&apos;t
          require app review for this single-user connection).
        </p>
      </Step>

      <Step n={4} title="Create OAuth credentials">
        <p>
          Go to <strong>APIs &amp; Services → Credentials → Create Credentials → OAuth client ID</strong>.
          Choose <strong>Web application</strong> as the type, and add this exact URL under{' '}
          <strong>Authorized redirect URIs</strong>:
        </p>
        <Code>{GOOGLE_REDIRECT_URI}</Code>
        <p>
          Click <strong>Create</strong>. Google shows you a <strong>Client ID</strong> and{' '}
          <strong>Client Secret</strong> — copy both.
        </p>
        <Screenshot label="Google Cloud Console — OAuth client created, showing Client ID and Client Secret" />
      </Step>

      <Step n={5} title="Connect in BillCraft">
        <p>
          In BillCraft, go to <strong>Settings → Email sending</strong>, paste the Client ID and
          Client Secret into the Google Workspace card, and click <strong>Save &amp; Connect</strong>.
          You&apos;ll be sent to Google to sign in and grant permission, then redirected back —
          BillCraft will show the connected mailbox address once it succeeds.
        </p>
      </Step>

      {/* Microsoft 365 / Azure */}
      <h2 className="mt-10 text-xl font-bold">Microsoft 365 / Azure setup</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        You&apos;ll need access to the{' '}
        <a href="https://entra.microsoft.com" target="_blank" rel="noopener noreferrer" className="text-[#1D8CFF] hover:underline">
          Microsoft Entra admin center
        </a>{' '}
        (formerly Azure Active Directory) for the tenant whose mailbox you want to connect.
      </p>

      <Step n={1} title="Register a new application">
        <p>
          In the Entra admin center, go to <strong>Identity → Applications → App registrations →
          New registration</strong>. Give it any name — e.g. &quot;BillCraft Email&quot;. Under{' '}
          <strong>Supported account types</strong>, choose the option matching who should be able to
          connect (typically &quot;Accounts in this organizational directory only&quot; for a single
          Workspace/tenant).
        </p>
      </Step>

      <Step n={2} title="Add the redirect URI">
        <p>
          Under <strong>Redirect URI</strong>, select platform type <strong>Web</strong> and enter:
        </p>
        <Code>{MICROSOFT_REDIRECT_URI}</Code>
        <p>Click <strong>Register</strong>.</p>
        <Screenshot label="Azure App registration — Redirect URI configuration" />
      </Step>

      <Step n={3} title="Grant Mail.Send permission">
        <p>
          Open the app you just registered → <strong>API permissions → Add a permission →
          Microsoft Graph → Delegated permissions</strong>. Search for and add{' '}
          <strong>Mail.Send</strong> and <strong>offline_access</strong>. If your organization
          requires admin consent, click <strong>Grant admin consent</strong> (only a tenant admin
          can do this step).
        </p>
      </Step>

      <Step n={4} title="Create a client secret">
        <p>
          Go to <strong>Certificates &amp; secrets → Client secrets → New client secret</strong>.
          Add a description and expiry, then click <strong>Add</strong>. Copy the secret{' '}
          <strong>Value</strong> immediately — Microsoft only shows it once.
        </p>
      </Step>

      <Step n={5} title="Copy your IDs">
        <p>
          From the app&apos;s <strong>Overview</strong> page, copy the{' '}
          <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong>.
        </p>
        <Screenshot label="Azure App Overview — Application (client) ID and Directory (tenant) ID" />
      </Step>

      <Step n={6} title="Connect in BillCraft">
        <p>
          In BillCraft, go to <strong>Settings → Email sending</strong>, paste the Application
          (client) ID, Client Secret, and Tenant ID into the Microsoft 365 card, and click{' '}
          <strong>Save &amp; Connect</strong>. You&apos;ll be sent to Microsoft to sign in and grant
          permission, then redirected back to BillCraft.
        </p>
      </Step>

      {/* Troubleshooting */}
      <h2 className="mt-10 text-xl font-bold">Troubleshooting</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        <strong>&quot;redirect_uri_mismatch&quot; error:</strong> the redirect URI registered in
        Google Cloud / Azure must match the one shown above exactly, including the{' '}
        <code className="rounded bg-muted px-1 text-xs">https://</code> and no trailing slash.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        <strong>Connection shows an error after redirecting back:</strong> check that the Gmail API
        (Google) or Mail.Send permission with admin consent (Microsoft) was actually granted in step
        3 of the relevant setup above, then disconnect and reconnect from{' '}
        <strong>Settings → Email sending</strong>.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        <strong>Disconnecting:</strong> you can remove the connection from{' '}
        <strong>Settings → Email sending</strong> at any time, or revoke access directly from your
        Google Account permissions page or the Entra admin center — either way, BillCraft falls back
        to its shared sender immediately.
      </p>

      {/* Related */}
      <div className="mt-10 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">Related articles</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li><Link href="/docs/notifications-and-email" className="text-[#1D8CFF] hover:underline">Email &amp; Notifications overview →</Link></li>
          <li><Link href="/docs/invoices" className="text-[#1D8CFF] hover:underline">Sending invoices →</Link></li>
        </ul>
      </div>
    </>
  )
}
