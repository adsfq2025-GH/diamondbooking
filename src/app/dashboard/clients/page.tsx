// src/app/dashboard/clients/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, getInitials } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserCheck, Plus } from "lucide-react";

export const metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

interface SearchParams { search?: string; page?: string }

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 25;

  const where = {
    businessId: session.user.businessId,
    ...(params.search ? {
      OR: [
        { name: { contains: params.search, mode: "insensitive" as const } },
        { email: { contains: params.search, mode: "insensitive" as const } },
        { phone: { contains: params.search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          take: 1,
          orderBy: { startTime: "desc" },
          select: { startTime: true, totalPrice: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <form className="flex gap-2 flex-1">
          <input
            name="search"
            defaultValue={params.search}
            placeholder="Search clients by name, email, or phone..."
            className="flex-1 min-w-48 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" variant="outline">Search</Button>
        </form>
        <Button asChild variant="gold">
          <Link href="/dashboard/clients/new">
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        {clients.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No clients yet</p>
            <p className="text-xs text-muted-foreground">
              Clients are added automatically when they book through your page
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bookings</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Visit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Since</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{getInitials(client.name)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{client.phone ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{client._count.bookings}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {client.bookings[0] ? formatDate(client.bookings[0].startTime) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(client.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/clients/${client.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{total} total clients</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}>Previous</Link>
                </Button>
              )}
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}>Next</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
