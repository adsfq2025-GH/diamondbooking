// src/app/api/superadmin/stats/route.ts
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSuperAdmin();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalBusinesses,
      newBusinessesThisMonth,
      allSubscriptions,
      activeSubscriptions,
      totalBookings,
      bookingsThisMonth,
      totalCustomers,
      cancelledThisMonth,
      activeLastMonth,
      revenueChartRaw,
      signupChartRaw,
      planDistribution,
      recentAuditLogs,
      pastDueBusinesses,
    ] = await Promise.all([
      // Total businesses
      prisma.business.count(),

      // New this month
      prisma.business.count({ where: { createdAt: { gte: startOfMonth } } }),

      // All subscriptions for MRR calc
      prisma.subscription.findMany({
        select: { plan: true, status: true },
      }),

      // Active paid subs
      prisma.subscription.count({
        where: {
          status: { in: ["ACTIVE", "TRIALING"] },
          plan: { not: "FREE" },
        },
      }),

      // Total bookings ever
      prisma.booking.count(),

      // Bookings this month
      prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),

      // Total customers
      prisma.customer.count(),

      // Cancelled this month (for churn)
      prisma.subscription.count({
        where: {
          status: "CANCELLED",
          cancelledAt: { gte: startOfMonth },
        },
      }),

      // Active last month (for churn denominator)
      prisma.subscription.count({
        where: {
          createdAt: { lte: endOfLastMonth },
          status: { in: ["ACTIVE", "TRIALING"] },
        },
      }),

      // Revenue chart: last 12 months
      prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*) as count
        FROM subscriptions
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
          AND plan != 'FREE'
          AND status IN ('ACTIVE', 'TRIALING')
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,

      // Signup chart: new businesses per month
      prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*) as count
        FROM businesses
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,

      // Plan distribution
      prisma.subscription.groupBy({
        by: ["plan"],
        _count: true,
      }),

      // Recent audit logs
      prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),

      // Businesses needing attention
      prisma.business.findMany({
        where: {
          OR: [
            { owner: { subscription: { status: "PAST_DUE" } } },
            { isActive: false },
          ],
        },
        include: {
          owner: {
            select: {
              email: true,
              subscription: { select: { plan: true, status: true } },
            },
          },
        },
        take: 10,
      }),
    ]);

    // Calculate MRR
    const planPrices: Record<string, number> = {
      FREE: 0, STARTER: 29, PROFESSIONAL: 59, ENTERPRISE: 119,
    };
    const mrr = allSubscriptions
      .filter((s) => ["ACTIVE", "TRIALING"].includes(s.status) && s.plan !== "FREE")
      .reduce((sum, s) => sum + (planPrices[s.plan] ?? 0), 0);

    const arr = mrr * 12;
    const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;
    const churnRate = activeLastMonth > 0
      ? (cancelledThisMonth / activeLastMonth) * 100
      : 0;

    // Build 12-month chart labels
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      );
    }

    const revenueChart = months.map((m) => {
      const found = revenueChartRaw.find((r) => r.month === m);
      return {
        month: m,
        subscriptions: found ? Number(found.count) : 0,
        mrr: found ? Number(found.count) * 44 : 0, // approximate avg
      };
    });

    const signupChart = months.map((m) => {
      const found = signupChartRaw.find((r) => r.month === m);
      return { month: m, signups: found ? Number(found.count) : 0 };
    });

    const totalForDist = planDistribution.reduce((s, p) => s + p._count, 0);
    const planDist = planDistribution.map((p) => ({
      plan: p.plan,
      count: p._count,
      percentage: totalForDist > 0 ? (p._count / totalForDist) * 100 : 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalBusinesses,
          newBusinessesThisMonth,
          activeSubscriptions,
          mrr,
          arr,
          totalBookings,
          bookingsThisMonth,
          totalCustomers,
          churnRate,
          arpu,
        },
        charts: {
          revenue: revenueChart,
          signups: signupChart,
          planDistribution: planDist,
        },
        recentActivity: recentAuditLogs,
        attentionNeeded: pastDueBusinesses,
      },
    });
  } catch (error) {
    console.error("[/api/superadmin/stats]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
