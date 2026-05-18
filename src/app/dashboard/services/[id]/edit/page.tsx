import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ServiceEditForm } from "./service-edit-form";

export const metadata = { title: "Edit Service" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function EditServicePage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const { id } = await params;

  const [service, staff] = await Promise.all([
    prisma.service.findFirst({
      where: { id, businessId: session.user.businessId },
      include: { staff: { select: { staffId: true } } },
    }),
    prisma.staff.findMany({
      where: { businessId: session.user.businessId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  if (!service) redirect("/dashboard/services");

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-heading text-foreground">Edit Service</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/services">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{service.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ServiceEditForm
            serviceId={service.id}
            initial={{
              name: service.name,
              description: service.description,
              duration: service.duration,
              price: Number(service.price),
              color: service.color,
              isActive: service.isActive,
              staffIds: service.staff.map((x) => x.staffId),
            }}
            staff={staff}
          />
        </CardContent>
      </Card>
    </div>
  );
}

