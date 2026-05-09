// src/app/superadmin/settings/page.tsx
import { prisma } from "@/lib/prisma";
import { PlatformSettingsForm } from "@/components/superadmin/platform-settings-form";
import { PlanConfigTable } from "@/components/superadmin/plan-config-table";

export const metadata = { title: "Platform Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, plans] = await Promise.all([
    prisma.platformSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, updatedAt: new Date() },
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
