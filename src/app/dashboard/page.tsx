// src/app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, formatTime, cn } from "@/lib/utils";
import { CalendarDays, Users, TrendingUp, DollarSign, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata = { title: "Overview — Dashboard" };
export const dynamic = "force-dynamic";

async function getDashboardData(businessId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayBookings,
    weekBookings,
    monthBookings,
    monthRevenue,
    totalClients,
    upcomingBookings,
  ] = await Promise.all([
    prisma.booking.count({
      where: { businessId, startTime: { gte: startOfToday, lt: endOfToday }, status: { not: "CANCELLED" } },
    }),
    prisma.booking.count({
      where: { businessId, startTime: { gte: startOfWeek }, status: { not: "CANCELLED" } },
    }),
    prisma.booking.count({
      where: { businessId, startTime: { gte: startOfMonth }, status: { not: "CANCELLED" } },
    }),
    prisma.booking.aggregate({
      where: { businessId, startTime: { gte: startOfMonth }, status: { not: "CANCELLED" } },
      _sum: { totalPrice: true },
    }),
    prisma.customer.count({ where: { businessId } }),
    prisma.booking.findMany({
      where: {
        businessId,
        startTime: { gte: now },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      take: 8,
      orderBy: { startTime: "asc" },
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true, color: true, duration: true } },
        staff: { select: { name: true } },
      },
    }),
  ]);

  return {
    stats: {
      todayBookings,
      weekBookings,
      monthBookings,
      monthRevenue: Number(monthRevenue._sum.totalPrice ?? 0),
      totalClients,
    },
    upcomingBookings,
  };
}

const STATUS_VARIANT: Record<string, "info" | "warning" | "success" | "destructive" | "secondary"> = {
  CONFIRMED: "info",
  PENDING: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "secondary",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const { stats, upcomingBookings } = await getDashboardData(session.user.businessId);

  const statCards = [
    { label: "Today's Bookings", value: stats.todayBookings, icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "This Week", value: stats.weekBookings, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "This Month", value: stats.monthBookings, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Monthly Revenue", value: formatCurrency(stats.monthRevenue), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total Clients", value: stats.totalClients, icon: Users, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold font-heading text-foreground mt-1.5">{value}</p>
              </div>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming bookings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming Appointments</CardTitle>
                <Link href="/dashboard/bookings" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-10">
                  <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No upcoming appointments</p>
                  <p className="text-xs text-muted-foreground">
                    Share your booking page to start getting appointments
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/dashboard/bookings/${booking.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
                    >
                      {/* Color dot */}
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: booking.service.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{booking.customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.service.name} · {booking.staff.name} · {booking.service.duration}min
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-foreground">{formatTime(booking.startTime)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(booking.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANT[booking.status] ?? "secondary"} className="shrink-0">
                        {booking.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {[
                { label: "Create Booking", href: "/dashboard/bookings/new", desc: "Book an appointment manually" },
                { label: "Add Service", href: "/dashboard/services/new", desc: "Create a new service offering" },
                { label: "Add Staff", href: "/dashboard/staff/new", desc: "Invite a team member" },
                { label: "View Booking Page", href: "#", desc: "See your public booking link", external: true },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
