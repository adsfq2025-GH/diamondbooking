import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { portalBasePath } from "@/lib/tenant-paths";

export const metadata = { title: "My Bookings" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TenantPortalBookingsPage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/b/${slug}/portal/login`);
  if (session.user.role !== "CUSTOMER") redirect("/dashboard");
  if (session.user.businessSlug !== slug) redirect(portalBasePath(session.user.businessSlug));

  if (!session.user.customerId) {
    return (
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            No client profile found for this email yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.customerId },
    orderBy: { startTime: "desc" },
    take: 50,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      service: { select: { name: true } },
      business: { select: { name: true } },
    },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground">Bookings</h2>
        <p className="text-sm text-muted-foreground">Recent and upcoming appointments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {bookings.map((b) => (
                <div key={b.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.service.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.business.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{b.status}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-foreground">{new Date(b.startTime).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.endTime).toLocaleTimeString()}</p>
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
