// src/app/superadmin/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { StatCard } from "@/components/superadmin/stat-card";
import { OverviewCharts } from "@/components/superadmin/overview-charts";
import { RecentActivity } from "@/components/superadmin/recent-activity";
import { AttentionList } from "@/components/superadmin/attention-list";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import {
  Building2, CreditCard, TrendingUp, CalendarDays,
  Users, BarChart3, AlertTriangle, DollarSign,
} from "lucide-react";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

async function getAdminStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const planPrices: Record<string, number> = {
    FREE: 0, STARTER: 29, PROFESSIONAL: 59, ENTERPRISE: 119,
  };

  const [
    totalBusinesses, newBusinessesThisMonth, newBusinessesLastMonth,
    allActiveSubs, totalBookings, bookingsThisMonth, bookingsLastMonth,
    totalCustomers, cancelledThisMonth, activeLastMonth,
    planDist, recentLogs, attentionBusinesses,
    revenueMonths, signupMonths,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.business.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.subscription.findMany({ select: { plan: true, status: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.booking.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.customer.count(),
    prisma.subscription.count({ where: { status: "CANCELLED", cancelledAt: { gte: startOfMonth } } }),
    prisma.subscription.count({ where: { createdAt: { lte: endOfLastMonth }, status: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.subscription.groupBy({ by: ["plan"], _count: true }),
    prisma.auditLog.findMany({
      take: 20, orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.business.findMany({
      where: { OR: [{ owner: { subscription: { status: "PAST_DUE" } } }, { isActive: false }] },
      include: { owner: { select: { email: true, subscription: { select: { plan: true, status: true } } } } },
      take: 10,
    }),
    // Revenue by month (last 12)
    prisma.$queryRaw<Array<{ month: Date; plan: string; cnt: bigint }>>`
      SELECT DATE_TRUNC('month', s."updatedAt") as month, s.plan, COUNT(*) as cnt
      FROM subscriptions s
      WHERE s.status IN ('ACTIVE','TRIALING') AND s.plan != 'FREE'
        AND s."updatedAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', s."updatedAt"), s.plan
      ORDER BY month ASC
    `,
    prisma.$queryRaw<Array<{ month: Date; cnt: bigint }>>`
      SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as cnt
      FROM businesses
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `,
  ]);

  const activeSubs = allActiveSubs.filter((s) => ["ACTIVE", "TRIALING"].includes(s.status));
  const mrr = activeSubs.reduce((sum, s) => sum + (planPrices[s.plan] ?? 0), 0);
  const arr = mrr * 12;
  const paidActiveSubs = activeSubs.filter((s) => s.plan !== "FREE").length;
  const arpu = paidActiveSubs > 0 ? mrr / paidActiveSubs : 0;
  const churnRate = activeLastMonth > 0 ? (cancelledThisMonth / activeLastMonth) * 100 : 0;

  const businessGrowth = newBusinessesLastMonth > 0
    ? ((newBusinessesThisMonth - newBusinessesLastMonth) / newBusinessesLastMonth) * 100
    : 0;
  const bookingGrowth = bookingsLastMonth > 0
    ? ((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth) * 100
    : 0;

  // Build chart data
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }

  const revenueChart = months.map((m) => {
    const monthSubs = revenueMonths.filter(
      (r) => new Date(r.month).toISOString().slice(0, 7) === m
    );
    const mrrVal = monthSubs.reduce(
      (sum, s) => sum + Number(s.cnt) * (planPrices[s.plan] ?? 0), 0
    );
    return { month: m, mrr: mrrVal };
  });

  const signupChart = months.map((m) => {
    const found = signupMonths.find(
      (r) => new Date(r.month).toISOString().slice(0, 7) === m
    );
    return { month: m, signups: found ? Number(found.cnt) : 0 };
  });

  const totalDist = planDist.reduce((s, p) => s + p._count, 0);
  const planDistribution = planDist.map((p) => ({
    plan: p.plan,
    count: p._count,
    percentage: totalDist > 0 ? (p._count / totalDist) * 100 : 0,
  }));

  return {
    kpis: {
      totalBusinesses, newBusinessesThisMonth, businessGrowth,
      paidActiveSubs, mrr, arr, arpu,
      totalBookings, bookingsThisMonth, bookingGrowth,
      totalCustomers, churnRate,
    },
    charts: { revenue: revenueChart, signups: signupChart, planDistribution },
    recentLogs,
    attentionBusinesses,
  };
}

export default async function SuperAdminOverview() {
  const stats = await getAdminStats();
  const { kpis, charts, recentLogs, attentionBusinesses } = stats;

  return (
    <div className="space-y-8">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Businesses"
          value={formatNumber(kpis.totalBusinesses)}
          subtitle={`+${kpis.newBusinessesThisMonth} this month`}
          change={kpis.businessGrowth}
          icon={Building2}
        />
        <StatCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(kpis.mrr)}
          subtitle={`ARR: ${formatCurrency(kpis.arr)}`}
          icon={DollarSign}
          accent
        />
        <StatCard
          title="Active Subscriptions"
          value={formatNumber(kpis.paidActiveSubs)}
          subtitle={`ARPU: ${formatCurrency(kpis.arpu)}`}
          icon={CreditCard}
        />
        <StatCard
          title="Churn Rate"
          value={formatPercentage(kpis.churnRate)}
          subtitle="This month"
          change={-kpis.churnRate}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Bookings"
          value={formatNumber(kpis.totalBookings)}
          subtitle={`${formatNumber(kpis.bookingsThisMonth)} this month`}
          change={kpis.bookingGrowth}
          icon={CalendarDays}
        />
        <StatCard
          title="Total End-Clients"
          value={formatNumber(kpis.totalCustomers)}
          icon={Users}
        />
        <StatCard
          title="ARR"
          value={formatCurrency(kpis.arr)}
          subtitle="Annual run rate"
          icon={BarChart3}
          accent
        />
        <StatCard
          title="Needs Attention"
          value={attentionBusinesses.length}
          subtitle="Past-due or suspended"
          icon={AlertTriangle}
          className={attentionBusinesses.length > 0 ? "border-destructive/30 bg-destructive/5" : ""}
        />
      </div>

      {/* Charts */}
      <OverviewCharts
        revenueData={charts.revenue}
        signupData={charts.signups}
        planDistribution={charts.planDistribution}
      />

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity logs={recentLogs} />
        <AttentionList businesses={attentionBusinesses} />
      </div>
    </div>
  );
}
