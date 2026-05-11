import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Privacy Policy" };

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";

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
          <p className="mt-4 text-sm text-primary/70">
            Replace this page with your actual Privacy Policy before going live.
          </p>
          <div className="mt-8 space-y-5 text-sm leading-relaxed text-primary/70">
            <p className="text-primary/90">
              This Privacy Policy describes how Diamond Booking collects, uses, and
              shares information.
            </p>
            <h2 className="text-base font-bold text-primary">
              Information We Collect
            </h2>
            <p>
              We collect account information (such as name and email), booking data
              you or your clients provide, and technical data needed to operate the
              service.
            </p>
            <h2 className="text-base font-bold text-primary">
              How We Use Information
            </h2>
            <p>
              We use information to provide the service, process payments, send
              transactional emails, and improve the product.
            </p>
            <h2 className="text-base font-bold text-primary">Payments</h2>
            <p>
              Payments are processed by Stripe. We do not store full payment card
              numbers.
            </p>
            <h2 className="text-base font-bold text-primary">Contact</h2>
            <p>
              For privacy requests, contact your published support email address.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
