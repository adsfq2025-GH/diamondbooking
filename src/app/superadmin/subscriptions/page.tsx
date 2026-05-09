// src/app/superadmin/subscriptions/page.tsx
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, getPlanBadgeClass, cn } from "@/lib/utils";
import { StatCard } from "@/components/superadmin/stat-card";
import { DollarSign, CreditCard, TrendingDown, Users } from "lucide-react";

export const metadata = { title: "Revenue & Subscriptions" };
export const dynamic = "force-dynamic";

const PLAN_PRICES: Record<string, number> = {
  FREE: 0, STARTER: 29, PROFESSIONAL: 59, ENTERPRISE: 119,
};

async function getRevenueData() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [allSubs, pastDueSubs, cancelledThisMonth, newThisMonth] = await Promise.all([
    prisma.subscription.findMany({
      include: {
        user: {
          select: {
            name: true, email: true,
            business: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscription.findMany({
      where: { status: "PAST_DUE" },
      include: {
        user: { select: { email: true, business: { select: { name: true } } } },
      },
    }),
    prisma.subscription.count({ where: { status: "CANCELLED", cancelledAt: { gte: startOfMonth } } }),
    prisma.subscription.count({ where: { createdAt: { gte: startOfMonth }, plan: { not: "FREE" } } }),
  ]);

  const activeSubs = allSubs.filter((s) => ["ACTIVE", "TRIALING"].includes(s.status));
  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0);
  const paidActive = activeSubs.filter((s) => s.plan !== "FREE").length;
  const arpu = paidActive > 0 ? mrr / paidActive : 0;

  return { allSubs, pastDueSubs, mrr, arr: mrr * 12, arpu, paidActive, cancelledThisMonth, newThisMonth };
}

export default async function SubscriptionsPage() {
  const data = await getRevenueData();

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Monthly Recurring Revenue" value={formatCurrency(data.mrr)} icon={DollarSign} accent />
        <StatCard title="Annual Recurring Revenue" value={formatCurrency(data.arr)} icon={TrendingDown} accent />
        <StatCard title="Paid Active Subscribers" value={data.paidActive} subtitle={`ARPU: ${formatCurrency(data.arpu)}`} icon={Users} />
        <StatCard title="New This Month" value={data.newThisMonth} icon={CreditCard} />
      </div>

      {/* Past due — needs attention */}
      {data.pastDueSubs.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-destructive mb-3">
            ⚠ Failed Payments ({data.pastDueSubs.length})
          </h3>
          <div className="space-y-2">
            {data.pastDueSubs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-destructive/20">
                <div>
                  <p className="text-sm font-medium text-foreground">{sub.user.business?.name ?? sub.user.email}</p>
                  <p className="text-xs text-muted-foreground">{sub.user.email} · {sub.plan}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`mailto:${sub.user.email}`}
                    className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-border">
                    Send Reminder
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All subscriptions table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">All Subscriptions</h3>
          <p className="text-xs text-muted-foreground">{data.allSubs.length} total</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Status</th>
                <th>MRR</th>
                <th>Period End</th>
              </tr>
            </thead>
            <tbody>
              {data.allSubs.map((sub) => (
                <tr key={sub.id} className={sub.status === "PAST_DUE" ? "bg-destructive/5" : ""}>
                  <td className="text-sm font-medium text-foreground">
                    {sub.user.business?.name ?? "—"}
                  </td>
                  <td className="text-xs text-muted-foreground">{sub.user.email}</td>
                  <td>
                    <span className={getPlanBadgeClass(sub.plan)}>{sub.plan}</span>
                  </td>
                  <td>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      sub.status === "ACTIVE" ? "badge-success" :
                      sub.status === "TRIALING" ? "badge-info" :
                      sub.status === "PAST_DUE" ? "badge-danger" :
                      "badge-neutral"
                    )}>
                      {sub.status}
                    </span>
                  </td>
                  <td className={cn("text-sm font-medium",
                    PLAN_PRICES[sub.plan] > 0 ? "text-accent" : "text-muted-foreground"
                  )}>
                    {PLAN_PRICES[sub.plan] > 0 ? formatCurrency(PLAN_PRICES[sub.plan]) : "—"}
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
