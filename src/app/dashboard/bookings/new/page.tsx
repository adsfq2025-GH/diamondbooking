import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingForm } from "./booking-form";

export const metadata = { title: "New Booking" };
export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const [services, staff] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: session.user.businessId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        duration: true,
        price: true,
        color: true,
        staff: { select: { staffId: true } },
      },
    }),
    prisma.staff.findMany({
      where: { businessId: session.user.businessId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  if (services.length === 0) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Create a booking</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <p className="text-sm text-muted-foreground">
            Add at least one service before creating a booking.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="gold">
              <Link href="/dashboard/services/new">Add Service</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/bookings">Back to bookings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Booking</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <BookingForm
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              duration: s.duration,
              price: Number(s.price),
              color: s.color,
              staffIds: s.staff.map((x) => x.staffId),
            }))}
            staff={staff}
          />
        </CardContent>
      </Card>
    </div>
  );
}

