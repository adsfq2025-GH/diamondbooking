// src/app/superadmin/bookings/page.tsx
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatCurrency, cn } from "@/lib/utils";
import { StatCard } from "@/components/superadmin/stat-card";
import { CalendarDays } from "lucide-react";

export const metadata = { title: "All Bookings" };
export const dynamic = "force-dynamic";

interface SearchParams { search?: string; status?: string; page?: string }

async function getBookings(params: SearchParams) {
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 30;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const where = {
    AND: [
      params.search ? {
        OR: [
          { customer: { name: { contains: params.search, mode: "insensitive" as const } } },
          { customer: { email: { contains: params.search, mode: "insensitive" as const } } },
          { business: { name: { contains: params.search, mode: "insensitive" as const } } },
        ],
      } : {},
      params.status ? { status: params.status as never } : {},
    ],
  };

  const [bookings, total, todayCount, weekCount, monthCount] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { startTime: "desc" },
      include: {
        business: { select: { name: true } },
        customer: { select: { name: true, email: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),
    prisma.booking.count({ where }),
    prisma.booking.count({ where: { startTime: { gte: startOfDay } } }),
    prisma.booking.count({ where: { startTime: { gte: startOfWeek } } }),
    prisma.booking.count({ where: { startTime: { gte: startOfMonth } } }),
  ]);

  return { bookings, total, page, totalPages: Math.ceil(total / pageSize), todayCount, weekCount, monthCount };
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = await getBookings(params);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground">All Bookings</h2>
        <p className="text-sm text-muted-foreground">Platform-wide booking activity (read-only)</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Today" value={data.todayCount} icon={CalendarDays} />
        <StatCard title="This Week" value={data.weekCount} icon={CalendarDays} />
        <StatCard title="This Month" value={data.monthCount} icon={CalendarDays} />
      </div>

      {/* Filters */}
      <form className="flex gap-3 bg-card border border-border rounded-xl p-4">
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search by client, business..."
          className="flex-1 px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <select
          name="status"
          defaultValue={params.status}
          className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NO_SHOW">No Show</option>
        </select>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-accent text-primary rounded-lg">
          Filter
        </button>
      </form>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Business</th>
                <th>Service</th>
                <th>Staff</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No bookings found</p>
                  </td>
                </tr>
              ) : (
                data.bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <p className="text-sm font-medium text-foreground">{b.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{b.customer.email}</p>
                    </td>
                    <td className="text-sm text-foreground">{b.business.name}</td>
                    <td className="text-sm text-foreground">{b.service.name}</td>
                    <td className="text-sm text-muted-foreground">{b.staff.name}</td>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(b.startTime)}
                    </td>
                    <td>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        b.status === "CONFIRMED" ? "badge-info" :
                        b.status === "COMPLETED" ? "badge-success" :
                        b.status === "CANCELLED" ? "badge-danger" :
                        b.status === "PENDING" ? "badge-warning" :
                        "badge-neutral"
                      )}>
                        {b.status}
                      </span>
                    </td>
                    <td className="text-sm font-medium text-foreground">
                      {formatCurrency(Number(b.totalPrice))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
