// src/app/page.tsx
import Link from "next/link";
import { Diamond, CheckCircle2, ArrowRight, Star, Calendar, Users, Zap, BarChart3, Bell, Globe, ChevronDown } from "lucide-react";

export const metadata = {
  title: "Diamond Booking — Online Booking for Growing Businesses",
  description: "Let your clients book appointments 24/7. Set up in minutes. Start for free.",
};

const FEATURES = [
  { icon: Globe,    title: "Online Booking Page",     desc: "Your own branded link clients can use 24/7 — no phone tag, no back-and-forth." },
  { icon: Calendar, title: "Smart Scheduling",         desc: "Automatically shows only available slots based on your hours, staff, and existing bookings." },
  { icon: Users,    title: "Team Management",          desc: "Add staff, assign services, set individual availability, and track everyone's bookings." },
  { icon: BarChart3,title: "Client Database",          desc: "Every client's history, contact details, and lifetime spend in one place." },
  { icon: Bell,     title: "Email Notifications",      desc: "Automated confirmations, reminders, and cancellations keep everyone in the loop." },
  { icon: Zap,      title: "Business Analytics",       desc: "Track bookings, revenue, no-show rates, and growth over time from your dashboard." },
];

const PLANS = [
  {
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    desc: "Perfect for getting started",
    features: ["1 staff member", "3 services", "20 bookings/month", "Public booking page", "Email confirmations"],
    cta: "Get started free",
    href: "/register",
    highlight: false,
  },
  {
    name: "Starter",
    price: { monthly: 29, yearly: 290 },
    desc: "For growing businesses",
    features: ["3 staff members", "10 services", "100 bookings/month", "Remove Diamond Booking branding", "Client database", "Basic analytics"],
    cta: "Start free trial",
    href: "/register",
    highlight: false,
  },
  {
    name: "Professional",
    price: { monthly: 59, yearly: 590 },
    desc: "Most popular for established businesses",
    features: ["10 staff members", "Unlimited services", "Unlimited bookings", "24h email reminders", "Advanced analytics", "Priority support", "Custom widget colors"],
    cta: "Start free trial",
    href: "/register",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: { monthly: 119, yearly: 1190 },
    desc: "For multi-location or high-volume",
    features: ["Unlimited staff", "Unlimited everything", "Custom domain", "API access", "Dedicated account manager", "SLA guarantee"],
    cta: "Start free trial",
    href: "/register",
    highlight: false,
  },
];

const FAQS = [
  { q: "How does the free trial work?", a: "Every account starts with a 14-day free trial of the Professional plan. No credit card required. After the trial, choose any plan — including the free plan." },
  { q: "Can I cancel anytime?", a: "Yes, absolutely. Cancel from your billing settings at any time. You keep access until the end of your paid period." },
  { q: "Do my clients need to create an account?", a: "No. Your clients book directly through your page without creating an account or downloading anything." },
  { q: "Can I customize my booking page?", a: "Yes — you can set your brand colors, logo, welcome message, and embed the booking calendar directly on your own website." },
  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards via Stripe. Invoices are available on Enterprise plans." },
  { q: "Can I embed the booking widget on my website?", a: "Yes. Every account gets a script snippet you can paste into any website — Squarespace, WordPress, Wix, Webflow, or custom HTML." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a1f36] flex items-center justify-center">
              <Diamond className="w-4 h-4 text-[#d4a843]" />
            </div>
            <span className="text-base font-bold text-[#1a1f36]">Diamond Booking</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-[#1a1f36] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#1a1f36] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#1a1f36] transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-[#1a1f36] transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/register"
              className="px-4 py-2 text-sm font-bold bg-[#1a1f36] text-white rounded-xl hover:bg-[#1a1f36]/90 transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f8f9ff] to-white pt-20 pb-28">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#d4a843]/8 blur-3xl" />
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-[#1a1f36]/5 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#d4a843]/10 border border-[#d4a843]/20 rounded-full text-xs font-semibold text-[#b88a2a] mb-6">
            <Star className="w-3 h-3 fill-[#d4a843] text-[#d4a843]" />
            No credit card required · 14-day free trial
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a1f36] leading-[1.1] mb-6">
            The booking platform
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4a843] to-amber-500">
              built for growing businesses
            </span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Let your clients book appointments 24/7. Your own branded booking page, smart scheduling, team management, and analytics — set up in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/register"
              className="px-8 py-4 text-base font-bold bg-[#1a1f36] text-white rounded-2xl hover:bg-[#1a1f36]/90 transition-all hover:shadow-xl hover:shadow-[#1a1f36]/20 flex items-center gap-2">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#pricing"
              className="px-8 py-4 text-base font-bold border-2 border-gray-200 text-gray-700 rounded-2xl hover:border-gray-300 transition-colors">
              See pricing
            </Link>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative max-w-4xl mx-auto">
            <div className="rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/60 overflow-hidden bg-white">
              <div className="h-8 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-1.5">
                {["#ff5f57","#febc2e","#28c840"].map((c) => (
                  <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                ))}
                <div className="flex-1 mx-4">
                  <div className="w-48 h-4 bg-gray-200 rounded-full mx-auto" />
                </div>
              </div>
              <div className="p-6 grid grid-cols-4 gap-4">
                {["Today's Bookings","This Week","Monthly Revenue","Total Clients"].map((label, i) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-[#1a1f36]">{["8","34","$2,840","127"][i]}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 grid grid-cols-3 gap-3">
                {[
                  { name: "Jane Smith", service: "Haircut & Style", time: "10:00 AM" },
                  { name: "Marcus Lee", service: "Color Treatment", time: "11:30 AM" },
                  { name: "Sara Chen",  service: "Blowout",          time: "1:00 PM"  },
                ].map((b) => (
                  <div key={b.name} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-[#1a1f36]/10 flex items-center justify-center text-xs font-bold text-[#1a1f36] shrink-0">
                      {b.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1a1f36] truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{b.service} · {b.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="py-20 bg-[#1a1f36]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Up and running in minutes</h2>
          <p className="text-gray-400 mb-12">No technical knowledge required</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Sign Up",                    desc: "Create your account and complete the onboarding wizard in under 5 minutes." },
              { step: "2", title: "Set Up Your Services",        desc: "Add your services, staff members, and set your availability hours." },
              { step: "3", title: "Share Your Booking Link",     desc: "Share your custom booking page or embed the widget directly on your website." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="w-12 h-12 rounded-2xl bg-[#d4a843]/20 border border-[#d4a843]/30 flex items-center justify-center text-xl font-black text-[#d4a843] mx-auto mb-4">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1a1f36] mb-4">Everything your business needs</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">One platform to manage bookings, staff, clients, and growth</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl border border-gray-100 hover:border-[#d4a843]/30 hover:shadow-lg hover:shadow-[#d4a843]/5 transition-all group">
                <div className="w-11 h-11 rounded-xl bg-[#1a1f36]/5 group-hover:bg-[#d4a843]/10 flex items-center justify-center mb-4 transition-colors">
                  <Icon className="w-5 h-5 text-[#1a1f36] group-hover:text-[#b88a2a] transition-colors" />
                </div>
                <h3 className="text-base font-bold text-[#1a1f36] mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1a1f36] mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-500">Start free. Scale when you're ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  plan.highlight
                    ? "bg-[#1a1f36] text-white shadow-2xl shadow-[#1a1f36]/30 scale-[1.02]"
                    : "bg-white border border-gray-200"
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#d4a843] text-[#1a1f36] text-[10px] font-black rounded-full uppercase tracking-widest">
                    Most Popular
                  </div>
                )}
                <div className="mb-5">
                  <p className={`text-sm font-bold mb-1 ${plan.highlight ? "text-[#d4a843]" : "text-gray-500"}`}>{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">${plan.price.monthly}</span>
                    <span className={`text-sm ${plan.highlight ? "text-gray-400" : "text-gray-400"}`}>/mo</span>
                  </div>
                  <p className={`text-xs mt-1 ${plan.highlight ? "text-gray-400" : "text-gray-400"}`}>{plan.desc}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlight ? "text-[#d4a843]" : "text-green-500"}`} />
                      <span className={plan.highlight ? "text-gray-300" : "text-gray-600"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}
                  className={`block text-center py-3 rounded-xl text-sm font-bold transition-all ${
                    plan.highlight
                      ? "bg-[#d4a843] text-[#1a1f36] hover:bg-amber-400"
                      : "bg-[#1a1f36] text-white hover:bg-[#1a1f36]/90"
                  }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            All plans include a 14-day free trial · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-[#1a1f36] mb-3">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group border border-gray-200 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-[#1a1f36] hover:bg-gray-50 transition-colors">
                  {q}
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <div className="px-6 pb-4 pt-0 text-sm text-gray-500 leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#1a1f36]">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#d4a843]/20 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-7 h-7 text-[#d4a843]" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Ready to fill your calendar?</h2>
          <p className="text-gray-400 mb-8 text-lg">Join thousands of businesses that use Diamond Booking to take appointments 24/7.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#d4a843] text-[#1a1f36] font-bold text-base rounded-2xl hover:bg-amber-400 transition-colors hover:shadow-xl hover:shadow-amber-400/20">
            Start your free trial <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-gray-500 text-sm mt-4">No credit card required · Setup in 5 minutes</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#1a1f36] flex items-center justify-center">
                <Diamond className="w-3.5 h-3.5 text-[#d4a843]" />
              </div>
              <span className="text-sm font-bold text-[#1a1f36]">Diamond Booking</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              {[
                ["#features","Features"],["#pricing","Pricing"],["#faq","FAQ"],
                ["/login","Login"],["/register","Sign Up"],["/terms","Terms"],["/privacy","Privacy"],
              ].map(([href, label]) => (
                <a key={label} href={href} className="hover:text-[#1a1f36] transition-colors">{label}</a>
              ))}
            </nav>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} Diamond Booking. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
