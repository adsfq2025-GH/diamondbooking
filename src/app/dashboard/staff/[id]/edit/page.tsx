import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StaffEditForm } from "./staff-edit-form";
import { InviteStaffPortalButton } from "./invite-staff-portal";

export const metadata = { title: "Edit Staff" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function EditStaffPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const { id } = await params;

  const [member, services] = await Promise.all([
    prisma.staff.findFirst({
      where: { id, businessId: session.user.businessId },
      include: { services: { select: { serviceId: true } } },
    }),
    prisma.service.findMany({
      where: { businessId: session.user.businessId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isActive: true, color: true },
    }),
  ]);

  if (!member) redirect("/dashboard/staff");

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-heading text-foreground">Edit Staff</h2>
        <div className="flex items-center gap-2">
          <InviteStaffPortalButton staffId={member.id} />
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/staff">Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{member.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <StaffEditForm
            staffId={member.id}
            initial={{
              name: member.name,
              email: member.email,
              phone: member.phone,
              isActive: member.isActive,
              serviceIds: member.services.map((s) => s.serviceId),
            }}
            services={services}
          />
        </CardContent>
      </Card>
    </div>
  );
}
