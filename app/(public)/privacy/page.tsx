import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — BillCraft AI',
  description: 'How BillCraft AI collects, uses, and protects your personal data.',
}

const LAST_UPDATED = 'June 25, 2026'

export default function PrivacyPage() {
  return (
    <div className="px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">

        {/* Page header */}
        <div className="mb-12 border-b border-border pb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            BillCraft AI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your personal
            information. This Privacy Policy explains what data we collect, how we use it, and your
            rights regarding that data.
          </p>
        </div>

        <div className="space-y-12 text-sm leading-relaxed text-foreground">

          {/* 1 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">1. Information We Collect</h2>

            <h3 className="mb-2 font-semibold text-foreground">Account information</h3>
            <p className="mb-4 text-muted-foreground">
              When you register, we collect your name, email address, and organisation name. If you
              sign in via Google OAuth, we receive your name and email from Google.
            </p>

            <h3 className="mb-2 font-semibold text-foreground">Business data</h3>
            <p className="mb-4 text-muted-foreground">
              We store the invoices, estimates, client records, expenses, and other business data
              you create within the service. This data belongs to you.
            </p>

            <h3 className="mb-2 font-semibold text-foreground">Payment information</h3>
            <p className="mb-4 text-muted-foreground">
              Subscription payments are processed by Stripe. We do not store your card number, CVV,
              or full payment details. Stripe retains a customer ID that we use to manage your
              subscription.
            </p>

            <h3 className="mb-2 font-semibold text-foreground">Usage data</h3>
            <p className="text-muted-foreground">
              We collect standard server logs (IP address, browser, pages visited, timestamps) to
              operate, secure, and improve the service.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">2. How We Use Your Information</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>To provide, maintain, and improve BillCraft AI.</li>
              <li>To send transactional emails (invoice delivery, payment receipts, reminders).</li>
              <li>To process AI-powered features using your invoice and client data as context.</li>
              <li>To manage your subscription and send billing notifications.</li>
              <li>To detect and prevent fraud, abuse, and security incidents.</li>
              <li>To respond to support requests.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              We do not sell your personal data or use it for advertising.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">3. Third-Party Services</h2>
            <p className="mb-4 text-muted-foreground">
              We use the following third-party processors. Each operates under their own privacy
              policy and data processing agreements.
            </p>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Provider</th>
                    <th className="px-4 py-3 text-left">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr><td className="px-4 py-3 font-medium text-foreground">Supabase</td><td className="px-4 py-3">Database and authentication</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-foreground">Stripe</td><td className="px-4 py-3">Subscription billing and payment processing</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-foreground">PayPal</td><td className="px-4 py-3">Alternative subscription billing</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-foreground">OpenAI</td><td className="px-4 py-3">AI-powered invoice generation and reminders</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-foreground">Resend</td><td className="px-4 py-3">Transactional email delivery</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-foreground">Vercel</td><td className="px-4 py-3">Application hosting and CDN</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">4. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your account data for as long as your account is active. If you delete your
              account, we will delete or anonymise your personal data within 30 days, except where
              we are required by law to retain it (for example, billing records for tax purposes,
              which are retained for 7 years).
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">5. Data Security</h2>
            <p className="text-muted-foreground">
              All data is encrypted in transit (TLS 1.2+) and at rest. We use row-level security
              policies to ensure your data is never accessible to other organisations. Sensitive
              credentials are stored using industry-standard secret management. While we take
              reasonable measures to protect your data, no system is completely secure, and we
              cannot guarantee absolute security.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">6. Your Rights</h2>
            <p className="mb-4 text-muted-foreground">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li><span className="font-medium text-foreground">Access</span> — request a copy of the personal data we hold about you.</li>
              <li><span className="font-medium text-foreground">Correction</span> — request that we correct inaccurate data.</li>
              <li><span className="font-medium text-foreground">Deletion</span> — request deletion of your account and associated data.</li>
              <li><span className="font-medium text-foreground">Portability</span> — request an export of your data in a machine-readable format.</li>
              <li><span className="font-medium text-foreground">Objection</span> — object to certain processing activities.</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:privacy@billcraft.ai" className="text-primary hover:underline">
                privacy@billcraft.ai
              </a>.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">7. Cookies</h2>
            <p className="text-muted-foreground">
              We use strictly necessary cookies to maintain your authenticated session. We do not
              use cookies for advertising or cross-site tracking. You can disable cookies in your
              browser settings, but this will prevent you from logging in.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">8. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Our infrastructure is hosted in the United States and European Union. If you are
              located outside these regions, your data may be transferred to and processed in
              countries that may have different data protection laws. By using the service, you
              consent to this transfer.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. When we do, we will update the
              &quot;Last updated&quot; date at the top of this page and, where the changes are material,
              notify you by email. Your continued use of the service after any changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">10. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions or concerns about this Privacy Policy, please contact us at:
            </p>
            <address className="mt-3 not-italic text-muted-foreground">
              <p className="font-medium text-foreground">BillCraft AI</p>
              <p>
                Email:{' '}
                <a href="mailto:privacy@billcraft.ai" className="text-primary hover:underline">
                  privacy@billcraft.ai
                </a>
              </p>
              <p>
                Website:{' '}
                <a href="https://billcraft.aakasa.dev" className="text-primary hover:underline">
                  billcraft.aakasa.dev
                </a>
              </p>
            </address>
          </section>

        </div>
      </div>
    </div>
  )
}
