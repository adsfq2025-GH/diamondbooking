import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Contact" };

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";

export default function ContactPage() {
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
            Contact
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-primary/70">
            For support, email{" "}
            <a href="mailto:support@diamond-booking.com" className="underline">
              support@diamond-booking.com
            </a>
            . For faster help, include your business name (or slug) and a screenshot
            of the issue.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/help"
              className="inline-flex items-center justify-center rounded-md border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            >
              Help Center
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-md border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            >
              Documentation
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
