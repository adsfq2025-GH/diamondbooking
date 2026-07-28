// src/app/dashboard/bookings/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatInTz } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { BookingStatusActions } from "@/components/dashboard/booking-status-actions";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

interface SearchParams { status?: string; search?: string; page?: string }

const STATUS_VARIANT: Record<string, "info" | "warning" | "success" | "destructive" | "secondary"> = {
  CONFIRMED: "info", PENDING: "warning", PENDING_PAYMENT: "warning", COMPLETED: "success",
  CANCELLED: "destructive", NO_SHOW: "secondary",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 20;

  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
    select: { timezone: true },
  });

  const where = {
    businessId: session.user.businessId,
    AND: [
      params.status ? { status: params.status as never } : {},
      params.search ? {
        OR: [
          { customer: { name: { contains: params.search, mode: "insensitive" as const } } },
          { customer: { email: { contains: params.search, mode: "insensitive" as const } } },
        ],
      } : {},
    ],
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { startTime: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        service: { select: { name: true, color: true } },
        staff: { select: { name: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form className="flex gap-2 flex-wrap flex-1">
          <input
            name="search"
            defaultValue={params.search}
            placeholder="Search by client name or email..."
            className="flex-1 min-w-48 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            name="status"
            defaultValue={params.status}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
          >
            <option value="">All statuses</option>
            {["PENDING_PAYMENT", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="default">Filter</Button>
        </form>
        <Button asChild variant="gold" size="default">
          <Link href="/dashboard/bookings/new">
            <Plus className="w-4 h-4 mr-2" /> New Booking
          </Link>
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {bookings.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No bookings found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Staff</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/clients/${booking.customer.id}`} className="hover:underline">
                        <p className="font-medium text-foreground">{booking.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: booking.service.color }} />
                        <span className="text-foreground">{booking.service.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{booking.staff.name}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {formatInTz(booking.startTime, business?.timezone ?? "UTC", "MMM d, yyyy 'at' h:mm a")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[booking.status] ?? "secondary"}>
                        {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatCurrency(Number(booking.totalPrice))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BookingStatusActions bookingId={booking.id} currentStatus={booking.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{total} total bookings</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}>Previous</Link>
                </Button>
              )}
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}>Next</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
