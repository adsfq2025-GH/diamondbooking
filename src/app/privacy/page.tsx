import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Privacy Policy" };

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";
const LAST_UPDATED = "May 28, 2026";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-primary/70">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-sm text-primary/70">
            This Privacy Policy explains how Diamond Booking collects, uses, discloses, and protects information when you use our website,
            dashboards, booking pages, and embedded widgets (the “Service”). This policy also describes choices you may have regarding your information.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-primary/70">
            <div>
              <h2 className="text-base font-bold text-primary">1. Roles: Platform vs. Business Owners</h2>
              <p>
                Business Owners use the Service to accept bookings from their Customers. In many cases, Business Owners are the “data controllers” (or equivalent)
                for booking/intake information they collect. Diamond Booking acts as a service provider/processor for that data to operate the Service.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">2. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <span className="text-primary/90">Account information:</span> name, email, password (stored hashed), role, and account settings.
                </li>
                <li>
                  <span className="text-primary/90">Business information:</span> business name, slug, contact details, services, availability, and branding.
                </li>
                <li>
                  <span className="text-primary/90">Booking and intake data:</span> appointment details, selected services/add-ons, answers to intake questions, and notes provided by Customers.
                </li>
                <li>
                  <span className="text-primary/90">Communications:</span> messages sent to support and system-generated transactional notifications.
                </li>
                <li>
                  <span className="text-primary/90">Technical data:</span> IP address, device/browser details, logs, and usage analytics necessary to secure and operate the Service.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">3. How We Use Information</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide, maintain, and secure the Service (including authentication, scheduling, and pricing calculations).</li>
                <li>Process subscriptions and billing for the platform.</li>
                <li>Send transactional messages (booking confirmations, reminders, password resets), based on your configuration.</li>
                <li>Monitor for fraud, abuse, and security threats; enforce platform policies.</li>
                <li>Improve performance and usability; debug errors; develop new features.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">4. Payments</h2>
              <p>
                Platform subscription payments are processed by Stripe. If you connect your own payment account (e.g., Stripe Connect),
                Customer booking payments may be processed in your payment processor environment and are subject to that provider’s terms and privacy practices.
                We do not store full payment card numbers.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">5. Cookies and Similar Technologies</h2>
              <p>
                We use cookies and similar technologies for authentication, security, and core functionality. You may be able to control cookies through your browser settings,
                but disabling them may prevent the Service from working properly.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">6. Sharing and Disclosure</h2>
              <p>We may share information with:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <span className="text-primary/90">Service providers</span> that help us run the Service (hosting, databases, email/SMS delivery, analytics, payment processing).
                </li>
                <li>
                  <span className="text-primary/90">Business Owners</span> when Customers submit booking information to that business.
                </li>
                <li>
                  <span className="text-primary/90">Legal and safety</span> where required to comply with law, protect rights, or prevent fraud/abuse.
                </li>
              </ul>
              <p className="mt-2">
                We do not sell personal information in the traditional sense.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">7. Data Retention</h2>
              <p>
                We retain information for as long as necessary to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements.
                Business Owners can export or delete data as supported by the Service. Some logs may be retained for security and compliance purposes.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">8. Security</h2>
              <p>
                We implement reasonable administrative, technical, and organizational safeguards to protect information. No method of transmission or storage is 100% secure,
                and we cannot guarantee absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">9. Your Rights and Choices</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You may access, update, or correct certain account information in your dashboard.</li>
                <li>You may request deletion of your account, subject to legal and operational retention requirements.</li>
                <li>Customers should contact the relevant Business Owner for requests related to booking/intake data collected by that business.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">10. Children</h2>
              <p>
                The Service is not directed to children under 13 (or the minimum age required in your jurisdiction). Do not use the Service if you do not meet the minimum age requirement.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. If changes are material, we will provide reasonable notice.
                Your continued use of the Service after changes become effective means you accept the updated policy.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-primary">12. Contact</h2>
              <p>
                For privacy questions or requests, contact support using the email address shown in your account or on our Contact page.
                For contractual terms, see our{" "}
                <Link href="/terms" className="underline text-primary">
                  Terms of Service
                </Link>
                .
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
