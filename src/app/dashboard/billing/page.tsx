// src/app/dashboard/billing/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { getUsageStats } from "@/lib/plan-limits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import { StripeConnectCard } from "@/components/dashboard/stripe-connect-card";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const PLAN_INFO = {
  FREE:         { name: "Free",         price: "$0",   color: "secondary" as const },
  STARTER:      { name: "Starter",      price: "$29",  color: "info" as const },
  PROFESSIONAL: { name: "Professional", price: "$59",  color: "warning" as const },
  ENTERPRISE:   { name: "Enterprise",   price: "$119", color: "enterprise" as const },
};

function UsageBar({ current, limit, label }: { current: number; limit: number; label: string }) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  const isNearLimit = pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${isNearLimit ? "text-amber-600" : "text-foreground"}`}>
          {current} {isUnlimited ? "" : `/ ${limit}`} {isUnlimited ? "(unlimited)" : ""}
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isNearLimit ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const [subscription, usage, business] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
    getUsageStats(session.user.businessId),
    prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: {
        stripeConnectAccountId: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
      },
    }),
  ]);

  const plan = subscription?.plan ?? "FREE";
  const planInfo = PLAN_INFO[plan as keyof typeof PLAN_INFO] ?? PLAN_INFO.FREE;

  const UPGRADES = [
    { plan: "STARTER", name: "Starter", price: "$29/mo", features: ["3 staff", "10 services", "100 bookings/mo", "Remove branding"] },
    { plan: "PROFESSIONAL", name: "Professional", price: "$59/mo", features: ["10 staff", "Unlimited services", "Unlimited bookings", "Email reminders"], popular: true },
    { plan: "ENTERPRISE", name: "Enterprise", price: "$119/mo", features: ["Unlimited staff", "Custom domain", "API access", "Dedicated support"] },
  ].filter((u) => u.plan !== plan);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Current plan */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Current Plan</CardTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant={planInfo.color}>{planInfo.name}</Badge>
                <span className="text-sm text-muted-foreground">{planInfo.price}/mo</span>
                {subscription?.status === "TRIALING" && (
                  <Badge variant="info">Trial</Badge>
                )}
              </div>
            </div>
            {plan !== "ENTERPRISE" && (
              <Button asChild variant="gold" size="sm">
                <Link href="#upgrade">
                  <Zap className="w-3.5 h-3.5 mr-1.5" /> Upgrade
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Trial info */}
          {subscription?.status === "TRIALING" && subscription.trialEnd && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">
                Your free trial ends on <strong>{formatDate(subscription.trialEnd)}</strong>.
                Add a payment method to continue using Diamond Booking.
              </p>
            </div>
          )}

          {/* Past due warning */}
          {subscription?.status === "PAST_DUE" && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">
                Your last payment failed. Please update your payment method to restore full access.
              </p>
            </div>
          )}

          {/* Usage stats */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Usage this month</p>
            <UsageBar current={usage.staff.current} limit={usage.staff.limit} label="Staff members" />
            <UsageBar current={usage.services.current} limit={usage.services.limit} label="Active services" />
            <UsageBar current={usage.bookingsThisMonth.current} limit={usage.bookingsThisMonth.limit} label="Bookings this month" />
          </div>

          {/* Period info */}
          {subscription?.currentPeriodEnd && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Next billing date: <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/api/billing/create-portal">Manage Payment Method</Link>
            </Button>
            {plan !== "FREE" && (
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link href="/api/billing/create-portal">Cancel Subscription</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <StripeConnectCard
        status={
          business
            ? {
                accountId: business.stripeConnectAccountId,
                chargesEnabled: business.stripeChargesEnabled,
                payoutsEnabled: business.stripePayoutsEnabled,
                detailsSubmitted: business.stripeDetailsSubmitted,
              }
            : null
        }
      />

      {/* Upgrade options */}
      {UPGRADES.length > 0 && plan !== "ENTERPRISE" && (
        <div id="upgrade">
          <h3 className="text-base font-semibold font-heading mb-4">Upgrade Your Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {UPGRADES.map((u) => (
              <div
                key={u.plan}
                className={`rounded-xl border p-5 relative ${u.popular ? "border-accent bg-accent/5" : "border-border bg-card"}`}
              >
                {u.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-accent text-primary px-3 py-0.5 rounded-full">
                    MOST POPULAR
                  </span>
                )}
                <p className="font-semibold font-heading text-foreground">{u.name}</p>
                <p className="text-lg font-bold text-foreground mt-1 mb-3">{u.price}</p>
                <ul className="space-y-1.5 mb-4">
                  {u.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="grid gap-2">
                  <Button
                    asChild
                    className="w-full"
                    variant={u.popular ? "gold" : "outline"}
                    size="sm"
                  >
                    <Link href={`/api/billing/create-checkout?plan=${u.plan}&interval=monthly`}>
                      Upgrade Monthly
                    </Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline" size="sm">
                    <Link href={`/api/billing/create-checkout?plan=${u.plan}&interval=yearly`}>
                      Upgrade Yearly
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
