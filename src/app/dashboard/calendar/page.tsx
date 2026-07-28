import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatInTz } from "@/lib/utils";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

interface SearchParams { date?: string }

function toYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
    select: { timezone: true },
  });

  const params = await searchParams;
  const selected = params.date ? new Date(params.date) : new Date();
  const selectedDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
  const nextDate = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: session.user.businessId,
      startTime: { gte: selectedDate, lt: nextDate },
      status: { not: "CANCELLED" },
    },
    orderBy: { startTime: "asc" },
    include: {
      customer: { select: { id: true, name: true } },
      service: { select: { name: true, color: true, duration: true } },
      staff: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-2">
          <input
            name="date"
            type="date"
            defaultValue={toYYYYMMDD(selectedDate)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
          />
          <Button type="submit" variant="outline">Go</Button>
          <Button asChild variant="ghost">
            <Link href={`/dashboard/calendar?date=${toYYYYMMDD(new Date())}`}>Today</Link>
          </Button>
        </form>
        <div className="text-sm text-muted-foreground">
          {formatDate(selectedDate)}
        </div>
      </div>

      <Card className="overflow-hidden">
        {bookings.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No bookings for this day</p>
            <p className="text-xs text-muted-foreground">Try another date, or create a manual booking</p>
            <div className="mt-5">
              <Button asChild variant="gold">
                <Link href="/dashboard/bookings/new">New Booking</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {bookings.map((b) => (
              <Link
                key={b.id}
                href={`/dashboard/bookings/${b.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.service.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{b.customer.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.service.name} · {b.staff.name} · {b.service.duration}min
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-foreground">{formatInTz(b.startTime, business?.timezone ?? "UTC", "h:mm a")}</p>
                  <p className="text-xs text-muted-foreground">{formatInTz(b.endTime, business?.timezone ?? "UTC", "h:mm a")}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

