import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "About" };

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";

export default function AboutPage() {
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
          <div className="flex items-center gap-3">
            <Link
              href="/help"
              className="inline-flex items-center justify-center rounded-md border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            >
              Help Center
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-bold text-primary hover:bg-accent/90"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-primary/10 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            About Diamond Booking
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-primary/70">
            Diamond Booking helps service businesses accept bookings 24/7 with a
            professional customer experience, real-time availability, and tools
            for teams to stay organized.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                title: "Built for service teams",
                desc: "Support multiple staff members, availability rules, and booking workflows.",
              },
              {
                title: "Designed for conversions",
                desc: "Mobile-first booking pages and embed widgets made to turn visitors into booked clients.",
              },
              {
                title: "Reliable by default",
                desc: "Secure authentication and tenant-safe data boundaries for growing businesses.",
              },
              {
                title: "Always improving",
                desc: "We ship iterative improvements and new templates based on real user feedback.",
              },
            ].map((x) => (
              <div
                key={x.title}
                className="rounded-xl border border-primary/10 bg-primary/5 p-4"
              >
                <div className="text-sm font-extrabold text-primary">{x.title}</div>
                <div className="mt-2 text-sm text-primary/70">{x.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-primary/10 bg-white p-4">
            <div className="text-sm font-extrabold text-primary">Need help?</div>
            <div className="mt-2 text-sm text-primary/70">
              Visit the <Link href="/help" className="underline">Help Center</Link>, read the{" "}
              <Link href="/docs" className="underline">Documentation</Link>, or email{" "}
              <a href="mailto:support@diamond-booking.com" className="underline">
                support@diamond-booking.com
              </a>
              .
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
