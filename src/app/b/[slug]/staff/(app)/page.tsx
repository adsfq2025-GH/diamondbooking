import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { staffBasePath } from "@/lib/tenant-paths";

export const metadata = { title: "Staff Overview" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TenantStaffHomePage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/b/${slug}/staff/login`);
  if (session.user.role !== "STAFF") redirect("/dashboard");
  if (session.user.businessSlug !== slug) redirect(staffBasePath(session.user.businessSlug));

  if (!session.user.staffId) {
    return (
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff Portal</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            This account is not linked to a staff profile yet. Ask the business owner to invite you again or ensure your staff email matches your login email.
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const basePath = staffBasePath(slug);
  const upcoming = await prisma.booking.findMany({
    where: { staffId: session.user.staffId, startTime: { gte: now } },
    orderBy: { startTime: "asc" },
    take: 10,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      service: { select: { name: true } },
      customer: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-heading text-foreground">Welcome back</h2>
          <p className="text-sm text-muted-foreground">Your next appointments and schedule.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}/schedule`}>View schedule</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Appointments</CardTitle>
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
                    <p className="text-xs text-muted-foreground truncate">{b.customer.name ?? b.customer.email}</p>
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

