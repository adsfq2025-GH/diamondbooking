import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Staff Schedule" };
export const dynamic = "force-dynamic";

export default async function StaffSchedulePage() {
  const session = await auth();
  if (!session?.user) redirect("/staff/login");
  if (session.user.role !== "STAFF") redirect("/dashboard");

  if (!session.user.staffId) {
    return (
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            This account is not linked to a staff profile yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);

  const bookings = await prisma.booking.findMany({
    where: {
      staffId: session.user.staffId,
      startTime: { gte: now, lte: end },
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      service: { select: { name: true } },
      customer: { select: { name: true, email: true, phone: true } },
    },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground">Schedule</h2>
        <p className="text-sm text-muted-foreground">Next 30 days of appointments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointments</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
          ) : (
            <div className="divide-y divide-border">
              {bookings.map((b) => (
                <div key={b.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.service.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.customer.name ?? b.customer.email}
                      {b.customer.phone ? ` • ${b.customer.phone}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{b.status}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-foreground">{new Date(b.startTime).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.endTime).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
