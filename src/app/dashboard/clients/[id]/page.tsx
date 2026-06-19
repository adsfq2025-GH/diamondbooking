import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Client" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function ClientDetailsPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const { id } = await params;
  const client = await prisma.customer.findFirst({
    where: { id, businessId: session.user.businessId },
    include: {
      bookings: {
        orderBy: { startTime: "desc" },
        include: {
          service: { select: { name: true, color: true } },
          staff: { select: { name: true } },
        },
      },
    },
  });

  if (!client) redirect("/dashboard/clients");

  const totalSpent = client.bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-heading text-foreground">{client.name}</h2>
          <p className="text-xs text-muted-foreground">{client.email}{client.phone ? ` · ${client.phone}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/clients">Back</Link>
          </Button>
          <Button asChild variant="gold" size="sm">
            <Link href="/dashboard/bookings/new">New Booking</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Bookings</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-1.5">{client.bookings.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-1.5">{formatCurrency(totalSpent)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Client Since</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-1.5">{formatDate(client.createdAt)}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Booking History</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {client.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No bookings yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {client.bookings.map((b) => (
                <Link
                  key={b.id}
                  href={`/dashboard/bookings/${b.id}`}
                  className="flex items-center gap-4 py-3 hover:bg-secondary/30 transition-colors px-2 rounded-lg"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: (b as any)?.service?.color ?? "#E5E7EB" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{(b as any)?.service?.name ?? "Service"}</p>
                    <p className="text-xs text-muted-foreground truncate">{(b as any)?.staff?.name ?? "Staff"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-foreground">{formatCurrency(Number(b.totalPrice))}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(b.startTime)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

