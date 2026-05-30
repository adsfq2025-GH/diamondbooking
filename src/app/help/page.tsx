import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Help Center" };

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";

export default function HelpCenterPage() {
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
              href="/docs"
              className="inline-flex items-center justify-center rounded-md border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            >
              Documentation
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
            Help Center
          </h1>
          <p className="mt-4 text-sm text-primary/70">
            Quick answers for business owners and teams. If you still need help,
            contact{" "}
            <a href="mailto:support@diamond-booking.com" className="underline">
              support@diamond-booking.com
            </a>
            .
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                title: "Getting started",
                items: [
                  "Create your business and choose an industry template",
                  "Add services and optional add-ons",
                  "Set availability so customers can see time slots",
                ],
              },
              {
                title: "Booking widget",
                items: [
                  "Copy the embed snippet into your website",
                  "Confirm live pricing shows as customers select options",
                  "Test a full booking end-to-end",
                ],
              },
              {
                title: "Staff portal",
                items: [
                  "Invite staff members",
                  "Manage schedules and availability",
                  "View assigned bookings",
                ],
              },
              {
                title: "Payments",
                items: [
                  "Manage your platform subscription",
                  "Connect Stripe (if available on your plan)",
                  "Understand booking payment flow",
                ],
              },
            ].map((x) => (
              <div
                key={x.title}
                className="rounded-xl border border-primary/10 bg-primary/5 p-4"
              >
                <div className="text-sm font-extrabold text-primary">{x.title}</div>
                <ul className="mt-3 space-y-2 text-sm text-primary/70">
                  {x.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-6">
            <h2 className="text-base font-extrabold text-primary">FAQ</h2>

            <div className="space-y-4 text-sm text-primary/70">
              <div className="rounded-xl border border-primary/10 bg-white p-4">
                <div className="font-bold text-primary">Why do I see “No availability”?</div>
                <div className="mt-2">
                  Make sure you have at least one staff member, working hours are set,
                  the service is offered, and there are no all-day blocks on the
                  calendar.
                </div>
              </div>

              <div className="rounded-xl border border-primary/10 bg-white p-4">
                <div className="font-bold text-primary">
                  How do I embed the widget on WordPress?
                </div>
                <div className="mt-2">
                  Paste the embed snippet into a Custom HTML block. If you use a page
                  builder, ensure it does not strip script tags.
                </div>
              </div>

              <div className="rounded-xl border border-primary/10 bg-white p-4">
                <div className="font-bold text-primary">
                  Can customers see staff names?
                </div>
                <div className="mt-2">
                  Customer-facing pages and messages are designed to avoid exposing
                  staff names by default.
                </div>
              </div>

              <div className="rounded-xl border border-primary/10 bg-white p-4">
                <div className="font-bold text-primary">
                  Where can I find Terms and Privacy?
                </div>
                <div className="mt-2">
                  See <Link href="/terms" className="underline">Terms</Link> and{" "}
                  <Link href="/privacy" className="underline">Privacy</Link>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

