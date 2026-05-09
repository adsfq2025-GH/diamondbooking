// src/app/superadmin/users/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import { Users, ExternalLink, CheckCircle, XCircle } from "lucide-react";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

interface SearchParams { search?: string; role?: string; status?: string; page?: string }

async function getUsers(params: SearchParams) {
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 25;
  const search = params.search ?? "";

  const where = {
    AND: [
      search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      } : {},
      params.role ? { role: params.role as never } : { role: { not: "SUPER_ADMIN" as never } },
      params.status === "active" ? { isActive: true }
        : params.status === "disabled" ? { isActive: false }
        : {},
    ],
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        business: { select: { name: true, id: true } },
        subscription: { select: { plan: true, status: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, totalPages: Math.ceil(total / pageSize) };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { users, total, page, totalPages } = await getUsers(params);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground">Users</h2>
        <p className="text-sm text-muted-foreground">{total} registered users (excluding super admins)</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <form className="flex flex-wrap gap-3">
          <input
            name="search"
            defaultValue={params.search}
            placeholder="Search by name or email..."
            className="flex-1 min-w-48 px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <select
            name="status"
            defaultValue={params.status}
            className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <button type="submit" className="px-4 py-2 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent/90">
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
                <th>User</th>
                <th>Business</th>
                <th>Plan</th>
                <th>Verified</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td>
                      {user.business ? (
                        <Link href={`/superadmin/businesses/${user.business.id}`} className="text-sm text-accent hover:underline">
                          {user.business.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs font-medium text-muted-foreground">
                        {user.subscription?.plan ?? "—"}
                      </span>
                    </td>
                    <td>
                      {user.emailVerified ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                    <td>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        user.isActive ? "badge-success" : "badge-danger"
                      )}>
                        {user.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/superadmin/users/${user.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-border"
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                  className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-border">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                  className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-border">
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
