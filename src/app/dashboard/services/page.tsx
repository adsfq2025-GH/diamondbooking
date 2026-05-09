// src/app/dashboard/services/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { ServiceActions } from "@/components/dashboard/service-actions";
import { Plus, Scissors, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Services" };
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const services = await prisma.service.findMany({
    where: { businessId: session.user.businessId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      staff: { include: { staff: { select: { id: true, name: true } } } },
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div className="space-y-6">
      {services.length === 0 ? (
        <Card className="py-16 text-center">
          <Scissors className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold font-heading mb-2">No services yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first service so clients can start booking
          </p>
          <Button asChild variant="gold">
            <Link href="/dashboard/services/new">
              <Plus className="w-4 h-4 mr-2" /> Add First Service
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="relative group">
              {/* Color accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                style={{ backgroundColor: service.color }}
              />
              <CardHeader className="pt-5 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{service.name}</CardTitle>
                    {service.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={service.isActive ? "success" : "secondary"} className="shrink-0 ml-2">
                    {service.isActive ? "Active" : "Hidden"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{service.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{formatCurrency(Number(service.price))}</span>
                  </div>
                </div>

                {/* Staff */}
                {service.staff.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Performed by</p>
                    <div className="flex flex-wrap gap-1">
                      {service.staff.slice(0, 3).map(({ staff }) => (
                        <span key={staff.id} className="text-xs bg-secondary px-2 py-0.5 rounded-full text-foreground">
                          {staff.name}
                        </span>
                      ))}
                      {service.staff.length > 3 && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                          +{service.staff.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {service._count.bookings} booking{service._count.bookings !== 1 ? "s" : ""}
                  </p>
                  <ServiceActions serviceId={service.id} businessId={session.user.businessId!} />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add new card */}
          <Link
            href="/dashboard/services/new"
            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors min-h-40 group"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Add service</span>
          </Link>
        </div>
      )}
    </div>
  );
}
