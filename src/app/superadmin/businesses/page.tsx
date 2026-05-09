// src/app/superadmin/businesses/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, getPlanBadgeClass, cn } from "@/lib/utils";
import { Building2, Search, Filter, ExternalLink } from "lucide-react";

export const metadata = { title: "Businesses" };
export const dynamic = "force-dynamic";

interface SearchParams { search?: string; plan?: string; status?: string; page?: string }

async function getBusinesses(params: SearchParams) {
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 25;
  const search = params.search ?? "";
  const plan = params.plan ?? "";
  const status = params.status ?? "";

  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { city: { contains: search, mode: "insensitive" as const } },
              { owner: { email: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {},
      plan ? { owner: { subscription: { plan: plan as never } } } : {},
      status === "active" ? { isActive: true }
        : status === "suspended" ? { isActive: false }
        : {},
    ],
  };

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: {
            id: true, name: true, email: true,
            subscription: { select: { plan: true, status: true } },
          },
        },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.business.count({ where }),
  ]);

  return { businesses, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { businesses, total, page, totalPages } = await getBusinesses(params);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-heading text-foreground">Businesses</h2>
          <p className="text-sm text-muted-foreground">{total} total businesses on the platform</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
        <form className="flex flex-wrap gap-3 w-full">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              name="search"
              defaultValue={params.search}
              placeholder="Search by name, email, city..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <select
            name="plan"
            defaultValue={params.plan}
            className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All plans</option>
            <option value="FREE">Free</option>
            <option value="STARTER">Starter</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
          <select
            name="status"
            defaultValue={params.status}
            className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent/90 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Bookings</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No businesses found</p>
                  </td>
                </tr>
              ) : (
                businesses.map((biz) => (
                  <tr key={biz.id}>
                    <td>
                      <div>
                        <p className="text-sm font-medium text-foreground">{biz.name}</p>
                        <p className="text-xs text-muted-foreground">/book/{biz.slug}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm text-foreground">{biz.owner.name}</p>
                        <p className="text-xs text-muted-foreground">{biz.owner.email}</p>
                      </div>
                    </td>
                    <td>
                      <span className={getPlanBadgeClass(biz.owner.subscription?.plan ?? "FREE")}>
                        {biz.owner.subscription?.plan ?? "FREE"}
                      </span>
                    </td>
                    <td>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        biz.isActive ? "badge-success" : "badge-danger"
                      )}>
                        {biz.isActive ? "Active" : "Suspended"}
                      </span>
                      {biz.owner.subscription?.status === "PAST_DUE" && (
                        <span className="badge-danger ml-1">Past Due</span>
                      )}
                    </td>
                    <td className="text-sm text-foreground">
                      {biz._count.bookings.toLocaleString()}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {formatDate(biz.createdAt)}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/superadmin/businesses/${biz.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-border transition-colors"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                  className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-border transition-colors"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                  className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-border transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
