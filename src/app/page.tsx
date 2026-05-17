import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";
const FOOTER_LOGO_SRC = "/brand/horizontal-dark-background.webp";

export const metadata = {
  title: "Diamond Booking — Online Booking for Growing Businesses",
  description:
    "Let clients book appointments 24/7 while you focus on what you do best.",
};

const FEATURES = [
  {
    icon: CalendarDays,
    title: "24/7 Online Booking",
    desc: "Let clients book appointments anytime with real-time availability updates.",
  },
  {
    icon: CreditCard,
    title: "Payment Processing",
    desc: "Accept payments and deposits with Stripe and keep billing centralized.",
  },
  {
    icon: Users,
    title: "Client Management",
    desc: "Build lasting relationships with client profiles and booking history.",
  },
  {
    icon: Smartphone,
    title: "Mobile Optimized",
    desc: "Beautiful booking experience on any device with responsive design.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    desc: "SSL encryption, secure auth, and tenant-safe data boundaries.",
  },
  {
    icon: Bell,
    title: "Automated Notifications",
    desc: "Email confirmations and reminders reduce no-shows automatically.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create Your Account",
    desc: "Sign up in minutes and set up your business profile, services, pricing, and availability.",
  },
  {
    step: "02",
    title: "Customize Your Booking Page",
    desc: "Get a personalized booking page with your branding, shareable link, and embed options.",
  },
  {
    step: "03",
    title: "Start Taking Bookings",
    desc: "Clients book instantly from your page with live availability and automatic confirmations.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Johnson",
    role: "Owner, Clean Sweep Services",
    quote:
      "Diamond Booking has been a game-changer for my cleaning business. I used to spend hours on the phone scheduling appointments. Now my clients book online and I get 30% more bookings.",
  },
  {
    name: "Michael Chase",
    role: "Licensed Massage Therapist",
    quote:
      "The automated reminders alone have reduced my no-shows by 20%. My schedule is finally full and I can focus on my clients, not back-and-forth messages.",
  },
  {
    name: "David Martinez",
    role: "Owner, NorthStar Plumbing",
    quote:
      "I was skeptical about online booking for my plumbing business, but Diamond Booking made it so easy. Setup took 15 minutes and now I get bookings even when I'm out on jobs.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: 29,
    desc: "Perfect for small businesses starting with online booking",
    features: [
      "24/7 online client booking",
      "Booking widget embed",
      "Client database",
      "Service providers with schedules",
      "Booking website with CMS",
      "Google Calendar sync",
      "Email confirmations & reminders",
      "Online payments (Stripe + PayPal)",
      "SSL encryption & 2FA",
      "Custom domain connection",
      "Custom CSS design editing",
    ],
    featured: false,
  },
  {
    name: "Professional",
    price: 59,
    desc: "Advanced features for growing businesses",
    features: [
      "Everything in Starter",
      "Group bookings & recurring bookings",
      "Appointment approval rules",
      "Buffer time settings",
      "Simultaneous booking limits",
      "Waiting list feature",
      "Intake forms & booking",
      "Tips/gratuity collection",
      "Service add-on purchases",
      "Product sales during booking",
      "Booking analytics dashboard",
      "Review and testimonials display",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    price: 119,
    desc: "Complete automation and advanced integrations",
    features: [
      "Everything in Professional",
      "Zapier connector & API integrations",
      "WhatsApp booking bot",
      "Live booking bot",
      "AI voice booking system",
      "Subscription & package bundles",
      "Loyalty program management",
      "Automated workflows",
      "Advanced employee scheduling",
      "Multi-location management",
      "Clean booking history controls",
      "File upload for clients",
      "Zoom/Google video bookings",
      "Make-Me-Look-Busy masking",
      "Advanced deposit automation",
      "Full automation dashboard",
    ],
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-foreground" suppressHydrationWarning>
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-28 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={HEADER_LOGO_SRC}
              alt="Diamond Booking"
              width={220}
              height={44}
              priority
              className="h-24 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-md px-3 py-2 text-sm font-semibold text-primary/80 hover:text-primary sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-bold text-primary shadow-sm hover:bg-accent/90"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/35 via-primary/10 to-white">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-14 lg:grid-cols-2 lg:pb-24 lg:pt-20">
            <div className="max-w-xl">
              <p className="mb-3 text-sm font-semibold text-primary/70">
                DIAMOND BOOKING
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
                Grow Your
                <br />
                Business with
                <br />
                <span className="text-primary">Online Booking</span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-primary/70 sm:text-base">
                The all-in-one booking platform for service businesses. Let clients
                book appointments 24/7 while you focus on what you do best.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-bold text-primary shadow-sm hover:bg-accent/90"
                >
                  Start 7-Day Free Trial <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-md border border-primary/20 bg-white px-5 py-3 text-sm font-bold text-primary hover:bg-primary/5"
                >
                  View Pricing
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-6">
                {[
                  { v: "3K+", l: "Active Businesses" },
                  { v: "500K+", l: "Appointments/Month" },
                  { v: "40%", l: "Avg. Growth" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="text-lg font-extrabold text-primary">{s.v}</p>
                    <p className="text-xs text-primary/70">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
              <div className="absolute -bottom-12 -right-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />

              <div className="relative mx-auto max-w-lg rounded-2xl border border-primary/15 bg-white/85 p-6 shadow-2xl shadow-primary/10 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">
                        New Appointment
                      </p>
                      <p className="text-xs text-primary/70">
                        Client Booked Online
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary/70">
                    Now
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  {[
                    { icon: CalendarDays, label: "Live Availability" },
                    { icon: CreditCard, label: "Payments" },
                    { icon: Bell, label: "Reminders" },
                    { icon: Users, label: "CRM" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-primary/10 bg-white px-4 py-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-primary/80">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-2 rounded-full border border-primary/10 bg-white px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="h-2 w-2 rounded-full bg-primary/30" />
                    <span className="h-2 w-2 rounded-full bg-primary/30" />
                  </div>
                  <p className="text-xs text-primary/70">
                    95% client satisfaction
                  </p>
                </div>
              </div>

              <div className="pointer-events-none absolute -right-4 top-10 hidden rounded-xl border border-primary/10 bg-white/80 px-3 py-2 shadow-lg shadow-primary/10 backdrop-blur lg:block">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-primary/80">
                    Real-time updates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary/5 py-16" id="features">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">
                Everything You Need to Manage Your Bookings
              </h2>
              <p className="mt-2 text-sm text-primary/70">
                From online scheduling to payment processing, we&apos;ve got you
                covered with enterprise-grade features.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-primary">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-primary/70">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center text-white">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                How it Works <ChevronRight className="h-3 w-3" />
              </p>
              <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                Get Started in
                <br />
                Three Simple Steps
              </h2>
              <p className="mt-2 text-sm text-white/70">
                Setting up your online booking system is quick and easy. Start
                accepting appointments in minutes.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <div
                  key={s.step}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white"
                >
                  <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-accent px-3 py-1 text-xs font-black text-primary">
                    {s.step}
                  </div>
                  <h3 className="text-base font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">
                Loved by Business Owners
              </h2>
              <p className="mt-2 text-sm text-primary/70">
                See how service businesses are growing revenue and saving time
                with Diamond Booking.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center gap-1 text-accent">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-sm font-black">
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-primary/75">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{t.name}</p>
                      <p className="text-xs text-primary/70">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-accent/20 py-20" id="pricing">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">
                Choose Your Perfect Plan
              </h2>
              <p className="mt-2 text-sm text-primary/70">
                Monthly or yearly billing available. Start with Starter and upgrade as your business grows.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className={[
                    "relative rounded-2xl border bg-white p-7 shadow-sm",
                    p.featured
                      ? "border-primary/25 shadow-lg shadow-primary/10"
                      : "border-primary/10",
                  ].join(" ")}
                >
                  {p.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      Most Popular
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm font-extrabold text-primary">
                      {p.name}
                    </p>
                    <div className="mt-2 flex items-end justify-center gap-1">
                      <p className="text-4xl font-black text-primary">
                        ${p.price}
                      </p>
                      <p className="pb-1 text-sm font-semibold text-primary/60">
                        /month
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-primary/70">{p.desc}</p>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-primary/75">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7">
                    <Link
                      href="/register"
                      className={[
                        "inline-flex w-full items-center justify-center rounded-md px-4 py-3 text-sm font-extrabold",
                        p.featured
                          ? "bg-accent text-primary hover:bg-accent/90"
                          : "bg-primary text-white hover:bg-primary/90",
                      ].join(" ")}
                    >
                      Start 7-Day Free Trial
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">
              Ready to Transform Your Booking Experience?
            </h2>
            <p className="mt-2 text-sm text-primary/70">
              Join thousands of businesses that have streamlined their scheduling
              with Diamond Booking.
            </p>
            <div className="mt-6">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-extrabold text-primary hover:bg-accent/90"
              >
                Get Started Today
              </Link>
            </div>
          </div>
        </section>

        <footer className="bg-primary py-12 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
              <div>
                <Image
                  src={FOOTER_LOGO_SRC}
                  alt="Diamond Booking"
                  width={220}
                  height={44}
                  className="h-[84px] w-auto"
                />
                <p className="mt-3 text-sm text-white/70">
                  Premium booking software for service-based businesses.
                </p>
              </div>

              <div>
                <p className="text-sm font-bold">Product</p>
                <ul className="mt-3 space-y-2 text-sm text-white/70">
                  <li>
                    <a href="#features" className="hover:text-white">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-white">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <Link href="/register" className="hover:text-white">
                      Free Trial
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-bold">Support</p>
                <ul className="mt-3 space-y-2 text-sm text-white/70">
                  <li>
                    <Link href="/faq" className="hover:text-white">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="hover:text-white">
                      Contact Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="hover:text-white">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-white">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-bold">Company</p>
                <ul className="mt-3 space-y-2 text-sm text-white/70">
                  <li>
                    <Link href="/" className="hover:text-white">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href="/" className="hover:text-white">
                      Documentation
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/60">
              © {new Date().getFullYear()} Diamond Booking USA. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
