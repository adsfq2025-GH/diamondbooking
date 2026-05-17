import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffForm } from "./staff-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "New Staff Member" };
export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const services = await prisma.service.findMany({
    where: { businessId: session.user.businessId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, isActive: true, color: true },
  });

  return (
    <div className="max-w-3xl space-y-4">
      {services.length === 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                No services yet. You can add staff now and assign services later.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/services/new">Add service</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Staff Member</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <StaffForm services={services} />
        </CardContent>
      </Card>
    </div>
  );
}

