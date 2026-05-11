import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Terms of Service" };

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";

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
          <p className="mt-4 text-sm text-primary/70">
            Replace this page with your actual Terms of Service before going live.
          </p>
          <div className="mt-8 space-y-5 text-sm leading-relaxed text-primary/70">
            <p className="text-primary/90">
              These Terms govern access to and use of the Diamond Booking service.
              By using the service, you agree to these Terms.
            </p>
            <h2 className="text-base font-bold text-primary">Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account
              credentials and for all activities that occur under your account.
            </p>
            <h2 className="text-base font-bold text-primary">Billing</h2>
            <p>
              Paid plans are billed in advance. Payments are processed by Stripe.
              Subscription changes and cancellations take effect according to your
              billing settings.
            </p>
            <h2 className="text-base font-bold text-primary">Acceptable Use</h2>
            <p>
              You agree not to misuse the service, attempt unauthorized access, or
              interfere with normal operation.
            </p>
            <h2 className="text-base font-bold text-primary">Contact</h2>
            <p>
              For questions about these Terms, contact support at your published
              support email address.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
