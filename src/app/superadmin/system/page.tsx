// src/app/superadmin/system/page.tsx
import { prisma } from "@/lib/prisma";
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";

export const metadata = { title: "System Health" };
export const dynamic = "force-dynamic";

async function checkSystemHealth() {
  const checks = {
    database: false,
    stripe: false,
    email: false,
  };

  const counts = { users: 0, businesses: 0, bookings: 0, customers: 0 };

  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
    const [u, b, bk, c] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.booking.count(),
      prisma.customer.count(),
    ]);
    counts.users = u; counts.businesses = b; counts.bookings = bk; counts.customers = c;
  } catch { /* db down */ }

  // Stripe check
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const res = await fetch("https://api.stripe.com/v1/charges?limit=1", {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      });
      checks.stripe = res.ok;
    }
  } catch { /* stripe unreachable */ }

  // Email check (just verify key exists)
  checks.email = !!process.env.RESEND_API_KEY;

  return { checks, counts };
}

export default async function SystemPage() {
  const { checks, counts } = await checkSystemHealth();

  const StatusIcon = ({ ok, warn }: { ok: boolean; warn?: boolean }) =>
    ok ? <CheckCircle className="w-5 h-5 text-green-400" />
      : warn ? <AlertCircle className="w-5 h-5 text-yellow-400" />
      : <XCircle className="w-5 h-5 text-destructive" />;

  const StatusBadge = ({ ok }: { ok: boolean }) => (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ok ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"}`}>
      {ok ? "Operational" : "Down"}
    </span>
  );

  const QUICK_LINKS = [
    { label: "Stripe Dashboard", url: "https://dashboard.stripe.com" },
    { label: "Vercel Dashboard", url: "https://vercel.com/dashboard" },
    { label: "Supabase", url: "https://supabase.com/dashboard" },
    { label: "Resend Dashboard", url: "https://resend.com/emails" },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground">System Health</h2>
        <p className="text-sm text-muted-foreground">Real-time status of platform services</p>
      </div>

      {/* Service status */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Services</p>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "Database (PostgreSQL)", key: "database", desc: "Prisma + Supabase/Neon" },
            { label: "Payment Processing (Stripe)", key: "stripe", desc: "Subscriptions & webhooks" },
            { label: "Email (Resend)", key: "email", desc: "Transactional emails", warn: true },
          ].map(({ label, key, desc, warn }) => {
            const ok = checks[key as keyof typeof checks];
            return (
              <div key={key} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <StatusIcon ok={ok} warn={warn && !ok} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <StatusBadge ok={ok} />
              </div>
            );
          })}
        </div>
      </div>

      {/* DB record counts */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Database Records</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(counts).map(([key, val]) => (
            <div key={key} className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xl font-bold font-heading text-foreground">{val.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground capitalize">{key}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Quick Links</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_LINKS.map(({ label, url }) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 bg-secondary rounded-lg hover:bg-border transition-colors group"
            >
              <span className="text-sm text-foreground">{label}</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* App info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-3">App Info</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">App Name</span>
            <span className="text-foreground font-mono">Diamond Booking</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Node Version</span>
            <span className="text-foreground font-mono">{process.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Environment</span>
            <span className="text-foreground font-mono">{process.env.NODE_ENV}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">App URL</span>
            <span className="text-foreground font-mono text-xs truncate max-w-48">
              {process.env.NEXT_PUBLIC_APP_URL}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
