// src/app/superadmin/settings/page.tsx
import { prisma } from "@/lib/prisma";
import { PlatformSettingsForm } from "@/components/superadmin/platform-settings-form";
import { PlanConfigTable } from "@/components/superadmin/plan-config-table";

export const metadata = { title: "Platform Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
  const stripeMode =
    stripeSecret.startsWith("sk_live_") ? "live" : stripeSecret.startsWith("sk_test_") ? "test" : "unknown";
  const stripeStatus = {
    mode: stripeSecret ? stripeMode : "missing",
    hasSecret: !!stripeSecret,
    hasWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasPrices:
      !!process.env.STRIPE_PRICE_STARTER_MONTHLY &&
      !!process.env.STRIPE_PRICE_PRO_MONTHLY &&
      !!process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  };

  const [settings, plans] = await Promise.all([
    prisma.platformSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, supportEmail: "support@diamond-booking.com", updatedAt: new Date() },
    }),
    prisma.planConfig.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground">Platform Settings</h2>
        <p className="text-sm text-muted-foreground">Global configuration for the Diamond Booking platform</p>
      </div>

      {/* General settings */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">General</h3>
        <PlatformSettingsForm settings={settings} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Stripe Billing</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Keys are managed in Vercel environment variables. This section shows current status only.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary p-4">
            <div className="text-xs font-medium text-muted-foreground">Mode</div>
            <div className="mt-2 text-sm font-semibold text-foreground">{stripeStatus.mode}</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <div className="text-xs font-medium text-muted-foreground">Secret Key</div>
            <div className="mt-2 text-sm font-semibold text-foreground">
              {stripeStatus.hasSecret ? "Configured" : "Missing"}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <div className="text-xs font-medium text-muted-foreground">Webhook + Prices</div>
            <div className="mt-2 text-sm font-semibold text-foreground">
              {stripeStatus.hasWebhook && stripeStatus.hasPrices ? "Configured" : "Needs review"}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/70 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          >
            Open Stripe Dashboard
          </a>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/70 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          >
            Open Vercel Env Vars
          </a>
        </div>
      </div>

      {/* Subscription plans */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Subscription Plans</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Display configuration only. Change Stripe prices in the Stripe Dashboard.
          </p>
        </div>
        <PlanConfigTable plans={plans} />
      </div>

      {/* Danger zone */}
      <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
        <p className="text-xs text-muted-foreground mb-4">Irreversible actions — use with extreme caution.</p>
        <div className="space-y-2">
          <button className="px-4 py-2 text-sm bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors">
            Purge Cancelled Accounts (90+ days)
          </button>
        </div>
      </div>
    </div>
  );
}
