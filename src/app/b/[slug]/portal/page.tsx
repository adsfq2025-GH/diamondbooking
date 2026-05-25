import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { portalBasePath } from "@/lib/tenant-paths";

export const metadata = { title: "Client Portal" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TenantPortalHomePage({ params }: Props) {
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
            <CardTitle className="text-base">Client Portal</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            No client profile found for this email yet. Book an appointment first, or make sure you are using the same email you used when booking.
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const basePath = portalBasePath(slug);
  const upcoming = await prisma.booking.findMany({
    where: { customerId: session.user.customerId, startTime: { gte: now } },
    orderBy: { startTime: "asc" },
    take: 10,
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-heading text-foreground">Welcome</h2>
          <p className="text-sm text-muted-foreground">Your upcoming appointments.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}/bookings`}>View all bookings</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.service.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.business.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">{new Date(b.startTime).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{b.status}</p>
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
