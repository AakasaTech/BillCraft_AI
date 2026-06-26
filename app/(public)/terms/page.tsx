import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — BillCraft AI',
  description: 'The terms and conditions governing your use of BillCraft AI.',
}

const LAST_UPDATED = 'June 25, 2026'

export default function TermsPage() {
  return (
    <div className="px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">

        {/* Page header */}
        <div className="mb-12 border-b border-border pb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Please read these Terms of Service (&quot;Terms&quot;) carefully before using BillCraft AI
            (&quot;the Service&quot;), operated by BillCraft AI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By creating an
            account or using the Service, you agree to be bound by these Terms.
          </p>
        </div>

        <div className="space-y-12 text-sm leading-relaxed text-foreground">

          {/* 1 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using BillCraft AI, you confirm that you are at least 18 years old,
              have the legal authority to enter into these Terms on behalf of yourself or your
              organisation, and agree to comply with all applicable laws and regulations.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground">
              BillCraft AI is a cloud-based invoicing and billing platform that provides AI-assisted
              invoice creation, client management, payment tracking, expense logging, recurring
              billing, and related business tools. The Service is provided on a subscription basis
              and may be updated or modified at any time.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">3. Account Registration</h2>
            <p className="mb-3 text-muted-foreground">
              You must create an account to use the Service. You agree to:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Provide accurate and complete registration information.</li>
              <li>Keep your password secure and not share it with others.</li>
              <li>Notify us immediately of any unauthorised access to your account.</li>
              <li>Be responsible for all activity that occurs under your account.</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">4. Subscription and Billing</h2>

            <h3 className="mb-2 font-semibold">Free trial</h3>
            <p className="mb-4 text-muted-foreground">
              New accounts receive a 60-day free trial with full access to Pro features. No credit
              card is required to start a trial. At the end of the trial period, you must subscribe
              to continue using the Service.
            </p>

            <h3 className="mb-2 font-semibold">Paid plans</h3>
            <p className="mb-4 text-muted-foreground">
              Paid subscriptions are billed in advance on a monthly or annual basis. All fees are
              non-refundable except as required by law or as stated in our refund policy. We reserve
              the right to change pricing with 30 days&apos; notice.
            </p>

            <h3 className="mb-2 font-semibold">Payment processing</h3>
            <p className="text-muted-foreground">
              Payments are processed by Stripe or PayPal. By subscribing, you authorise us to
              charge your payment method on a recurring basis. If a payment fails, we will attempt
              to collect payment again and may suspend access to the Service.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">5. Acceptable Use</h2>
            <p className="mb-3 text-muted-foreground">You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Use the Service for any unlawful, fraudulent, or harmful purpose.</li>
              <li>Send spam or unsolicited communications through the Service.</li>
              <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
              <li>Upload malicious code, viruses, or any content that could damage the Service or other users.</li>
              <li>Exceed usage limits in a manner that degrades performance for other users.</li>
              <li>Resell or sublicense access to the Service without our written consent.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">6. Your Data</h2>
            <p className="mb-3 text-muted-foreground">
              You retain full ownership of all data you upload or create within the Service
              (&quot;Your Data&quot;). By using the Service, you grant us a limited licence to store,
              process, and display Your Data solely to provide the Service to you.
            </p>
            <p className="text-muted-foreground">
              You are responsible for the accuracy and legality of Your Data, including the invoices
              you issue and the client information you store. We process Your Data in accordance
              with our{' '}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">7. AI Features</h2>
            <p className="text-muted-foreground">
              BillCraft AI uses artificial intelligence to assist with invoice generation and payment
              reminders. AI-generated content is provided as a starting point and may contain errors.
              You are responsible for reviewing and approving all invoices and communications before
              sending them to your clients. We do not guarantee the accuracy of any AI output.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">8. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The Service, including its software, design, and content (excluding Your Data), is
              owned by BillCraft AI and protected by intellectual property laws. You may not copy,
              modify, distribute, or create derivative works from any part of the Service without
              our written permission.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
              either express or implied, including but not limited to warranties of merchantability,
              fitness for a particular purpose, or non-infringement. We do not warrant that the
              Service will be uninterrupted, error-free, or free of viruses or other harmful
              components.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by applicable law, BillCraft AI and its affiliates
              will not be liable for any indirect, incidental, special, consequential, or punitive
              damages, including loss of profits, data, or goodwill, arising out of or related to
              your use of the Service. Our total liability for any claim arising from these Terms
              or your use of the Service is limited to the amount you paid us in the 12 months
              preceding the claim.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">11. Termination</h2>
            <p className="mb-3 text-muted-foreground">
              You may cancel your account at any time from the billing settings page. Cancellation
              takes effect at the end of the current billing period.
            </p>
            <p className="text-muted-foreground">
              We may suspend or terminate your account immediately, without notice, if you breach
              these Terms, fail to pay, or if we reasonably believe your use of the Service poses a
              risk to others. Upon termination, your right to use the Service ceases and we may
              delete your data after a 30-day grace period.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">12. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by and construed in accordance with applicable law. Any
              disputes arising under these Terms shall be subject to the exclusive jurisdiction of
              the competent courts. If any provision of these Terms is found to be unenforceable,
              the remaining provisions will continue in full force and effect.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">13. Changes to These Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. When we make material changes, we will
              notify you by email and update the &quot;Last updated&quot; date. Your continued use of the
              Service after changes are posted constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">14. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please contact us:
            </p>
            <address className="mt-3 not-italic text-muted-foreground">
              <p className="font-medium text-foreground">BillCraft AI</p>
              <p>
                Email:{' '}
                <a href="mailto:legal@billcraft.ai" className="text-primary hover:underline">
                  legal@billcraft.ai
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
