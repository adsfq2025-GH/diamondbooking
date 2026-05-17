import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceForm } from "./service-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "New Service" };
export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const staff = await prisma.staff.findMany({
    where: { businessId: session.user.businessId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, isActive: true },
  });

  return (
    <div className="max-w-3xl space-y-4">
      {staff.length === 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                No staff members yet. You can still create services now and assign staff later.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/staff/new">Add staff</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Service</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ServiceForm staff={staff} />
        </CardContent>
      </Card>
    </div>
  );
}

