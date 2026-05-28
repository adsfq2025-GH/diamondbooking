import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Terms of Service" };

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";
const LAST_UPDATED = "May 28, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-primary/5">
      <header className="border-b border-primary/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-28 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image
              src={HEADER_LOGO_SRC}
              alt="Diamond Booking"
              width={220}
              height={44}
              className="h-[84px] w-auto"
            />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-bold text-primary hover:bg-accent/90"
          >
            Start Free Trial
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-primary/10 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-primary/70">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-sm text-primary/70">
            These Terms of Service (the “Terms”) govern your access to and use of Diamond Booking (the “Service”).
            By creating an account, embedding our booking widget, or otherwise using the Service, you agree to these Terms.
            If you do not agree, do not use the Service.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-primary/70">
            <div>
              <h2 className="text-base font-bold text-primary">1. Definitions</h2>
              <p>
                “You” means the individual or entity using the Service. “Business Owner” means the primary account holder for a business.
                “Customers” means end-users who book appointments through your booking page/widget. “Content” means text, images, schedules,
                service descriptions, pricing, intake fields, and other information you upload or provide.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">2. Account Eligibility and Security</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must provide accurate information and keep it up to date.</li>
                <li>You are responsible for all activity under your account and the accounts you invite (staff/team).</li>
                <li>You must safeguard passwords, API keys, and connected payment accounts.</li>
                <li>You must promptly notify us of any unauthorized access or security incident.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">3. Your Content and Booking Data</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You retain ownership of your Content. You grant us a license to host, process, and display your Content to operate the Service.</li>
                <li>You represent that you have all rights and permissions to upload Content and to collect booking/intake information from Customers.</li>
                <li>You are responsible for configuring services, pricing, availability, and policies, including ensuring that displayed prices and taxes (if any) are accurate for your business.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Use the Service for unlawful, harmful, deceptive, or abusive activity.</li>
                <li>Attempt to bypass authentication, rate limits, access controls, or tenant isolation.</li>
                <li>Interfere with or disrupt the Service, including through automated abuse, scraping, or denial-of-service.</li>
                <li>Upload malware or attempt to compromise our infrastructure or other users’ data.</li>
                <li>Misrepresent your identity or your business to Customers.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">5. Payments, Billing, and Trials</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Paid plans are billed in advance on a recurring basis unless canceled.</li>
                <li>Subscription payments for Diamond Booking are processed by Stripe. We do not store full card numbers.</li>
                <li>When you connect your own Stripe account (if available on your plan), Customer payments may be processed in your Stripe environment and subject to Stripe’s terms.</li>
                <li>Taxes are your responsibility unless explicitly stated otherwise.</li>
                <li>Plan features, limits, and pricing may change; we will provide reasonable notice where required.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">6. Cancellations and Refunds</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You may cancel your subscription at any time from your billing settings. Cancellation takes effect at the end of the current billing period unless otherwise stated.</li>
                <li>Fees already paid are non-refundable except where required by law or explicitly stated in writing.</li>
                <li>Customer refunds for bookings (if you accept payments) are handled in your payment processor (e.g., your Stripe account) and are your responsibility.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">7. Third-Party Services</h2>
              <p>
                The Service may integrate with third-party services (e.g., Stripe, Google, Resend, Twilio). Your use of third-party services is governed by their terms.
                We are not responsible for third-party outages, errors, or data handling outside of our control.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">8. Intellectual Property</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>We own and retain all rights to the Service, including software, designs, and trademarks.</li>
                <li>You may not reverse engineer, copy, or create derivative works of the Service except as permitted by law.</li>
                <li>You may use our embed code and widgets solely to display your booking experience as intended.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">9. Privacy</h2>
              <p>
                Our <Link href="/privacy" className="underline text-primary">Privacy Policy</Link> explains how we collect, use, and share information.
                You are responsible for providing appropriate notices and obtaining consents from your Customers where required.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">10. Disclaimer; Limitation of Liability</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>The Service is provided “as is” and “as available” without warranties of any kind.</li>
                <li>To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages.</li>
                <li>Our aggregate liability arising out of or related to the Service will not exceed the amounts paid by you to us for the Service in the prior 3 months.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">11. Suspension and Termination</h2>
              <p>
                We may suspend or terminate access to the Service if we reasonably believe you violated these Terms, pose a security risk, or if required by law.
                You may stop using the Service at any time.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">12. Changes to the Terms</h2>
              <p>
                We may update these Terms from time to time. If changes are material, we will provide reasonable notice.
                Continued use of the Service after changes become effective constitutes acceptance.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">13. Contact</h2>
              <p>
                Questions about these Terms? Contact support using the email address shown in your account or on our Contact page.
              </p>
            </div>

            <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-primary/80">
              This page is a platform template and may need review by your legal counsel to match your business model, jurisdictions, and regulatory requirements.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
