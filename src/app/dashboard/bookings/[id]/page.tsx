import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { BookingStatusActions } from "@/components/dashboard/booking-status-actions";

export const metadata = { title: "Booking" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const STATUS_VARIANT: Record<string, "info" | "warning" | "success" | "destructive" | "secondary"> = {
  CONFIRMED: "info",
  PENDING: "warning",
  PENDING_PAYMENT: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "secondary",
};

export default async function BookingDetailsPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id, businessId: session.user.businessId },
    include: {
      customer: true,
      service: { select: { name: true, color: true, duration: true } },
      staff: { select: { name: true } },
    },
  });

  if (!booking) {
    redirect("/dashboard/bookings");
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: booking.service.color }} />
          <div>
            <h2 className="text-lg font-semibold font-heading text-foreground">{booking.customer.name}</h2>
            <p className="text-xs text-muted-foreground">{booking.service.name} · {booking.staff.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/bookings">Back</Link>
          </Button>
          <BookingStatusActions bookingId={booking.id} currentStatus={booking.status} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Booking Details</CardTitle>
            <Badge variant={STATUS_VARIANT[booking.status] ?? "secondary"}>
              {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Start</p>
              <p className="font-medium text-foreground">{formatDateTime(booking.startTime)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">End</p>
              <p className="font-medium text-foreground">{formatDateTime(booking.endTime)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium text-foreground">{booking.service.duration} min</p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-medium text-foreground">{formatCurrency(Number(booking.totalPrice))}</p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">Client</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{booking.customer.name}</p>
                <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/clients/${booking.customer.id}`}>View Client</Link>
              </Button>
            </div>
          </div>

          {booking.notes && (
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-foreground whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

