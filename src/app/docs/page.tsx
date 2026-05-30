import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Documentation" };

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";

export default function DocumentationPage() {
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
            Documentation
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-primary/70">
            Reference guides for setting up your booking page, managing services,
            and embedding the widget. If you need hands-on help, email{" "}
            <a href="mailto:support@diamond-booking.com" className="underline">
              support@diamond-booking.com
            </a>
            .
          </p>

          <div className="mt-8 space-y-4">
            {[
              {
                title: "1) Create your business",
                items: [
                  "Complete onboarding with your business name, contact info, and industry template",
                  "Add your services and optional add-ons",
                  "Set your business hours and staff schedules",
                ],
              },
              {
                title: "2) Availability and time slots",
                items: [
                  "Ensure at least one staff member is active and has working hours",
                  "Confirm services are assigned to staff (if applicable)",
                  "Check for day-off blocks that remove availability",
                ],
              },
              {
                title: "3) Booking widget embed",
                items: [
                  "Copy the embed snippet from your dashboard",
                  "Paste it into a Custom HTML block on WordPress (or your site builder)",
                  "Test on a published page and confirm the widget loads",
                ],
              },
              {
                title: "4) Pricing and payments",
                items: [
                  "Verify base service prices and add-on prices",
                  "Confirm live subtotal updates during booking",
                  "Configure payment settings for deposits or full payment (if enabled)",
                ],
              },
              {
                title: "5) Staff and operations",
                items: [
                  "Invite staff, set roles, and configure schedules",
                  "Review new bookings in the staff portal",
                  "Use notifications and reminders to reduce no-shows",
                ],
              },
              {
                title: "6) Troubleshooting",
                items: [
                  "If a widget doesn’t load, verify the URL/slug and that script tags aren’t stripped by the editor",
                  "If there are no time slots, re-check staff working hours and blocks",
                  "If you hit an error, send a screenshot and the affected business slug to support",
                ],
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-primary/10 bg-primary/5 p-4"
              >
                <div className="text-sm font-extrabold text-primary">{s.title}</div>
                <ul className="mt-3 space-y-2 text-sm text-primary/70">
                  {s.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            >
              Contact Us
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center justify-center rounded-md border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center justify-center rounded-md border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            >
              Privacy
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
