// src/app/dashboard/staff/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getInitials } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Staff" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const staff = await prisma.staff.findMany({
    where: { businessId: session.user.businessId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      services: { include: { service: { select: { id: true, name: true, color: true } } } },
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div className="space-y-6">
      {staff.length === 0 ? (
        <Card className="py-16 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold font-heading mb-2">No staff members yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add your team so clients can choose who they book with
          </p>
          <Button asChild variant="gold">
            <Link href="/dashboard/staff/new">
              <Plus className="w-4 h-4 mr-2" /> Add First Staff Member
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((member) => (
            <Card key={member.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-primary">
                      {getInitials(member.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{member.name}</CardTitle>
                    {member.email && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
                    )}
                  </div>
                  <Badge variant={member.isActive ? "success" : "secondary"}>
                    {member.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {member.services.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Services offered</p>
                    <div className="flex flex-wrap gap-1">
                      {member.services.slice(0, 4).map(({ service }) => (
                        <span
                          key={service.id}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: `${service.color}20`,
                            color: service.color,
                          }}
                        >
                          {service.name}
                        </span>
                      ))}
                      {member.services.length > 4 && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                          +{member.services.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {member._count.bookings} total bookings
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/staff/${member.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Link
            href="/dashboard/staff/new"
            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors min-h-40 group"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Add staff member</span>
          </Link>
        </div>
      )}
    </div>
  );
}
