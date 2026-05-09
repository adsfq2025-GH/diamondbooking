// src/app/superadmin/audit-log/page.tsx
import { prisma } from "@/lib/prisma";
import { formatDateTime, cn } from "@/lib/utils";
import { getAuditActionLabel } from "@/lib/audit";
import { ScrollText } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

interface SearchParams { search?: string; action?: string; page?: string }

async function getLogs(params: SearchParams) {
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 50;

  const where = {
    AND: [
      params.search ? {
        OR: [
          { userEmail: { contains: params.search, mode: "insensitive" as const } },
          { targetName: { contains: params.search, mode: "insensitive" as const } },
        ],
      } : {},
      params.action ? { action: params.action } : {},
    ],
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / pageSize) };
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { logs, total, page, totalPages } = await getLogs(params);

  const ACTION_CATEGORIES = [
    "BUSINESS_SUSPENDED", "BUSINESS_DELETED", "USER_DELETED",
    "SUBSCRIPTION_PLAN_CHANGED", "PAYMENT_FAILED", "ADMIN_IMPERSONATED_USER",
    "ADMIN_BROADCAST_EMAIL_SENT", "ADMIN_MAINTENANCE_TOGGLED",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-heading text-foreground">Audit Log</h2>
          <p className="text-sm text-muted-foreground">{total} immutable records</p>
        </div>
        <a
          href="/api/superadmin/audit-log/export"
          className="px-3 py-2 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-border"
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <form className="flex gap-3 bg-card border border-border rounded-xl p-4 flex-wrap">
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search by user email or target..."
          className="flex-1 min-w-48 px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <select
          name="action"
          defaultValue={params.action}
          className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground"
        >
          <option value="">All actions</option>
          {ACTION_CATEGORIES.map((a) => (
            <option key={a} value={a}>{getAuditActionLabel(a as Parameters<typeof getAuditActionLabel>[0])}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-accent text-primary rounded-lg">
          Filter
        </button>
      </form>

      {/* Log feed */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No audit entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4">
                {/* Timestamp */}
                <div className="shrink-0 w-36">
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                </div>

                {/* Action badge */}
                <div className="shrink-0">
                  <span className={cn(
                    "inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-mono font-medium",
                    log.action.includes("DELETED") || log.action.includes("SUSPENDED") || log.action.includes("FAILED")
                      ? "bg-destructive/10 text-destructive"
                      : log.action.includes("ADMIN_")
                      ? "bg-accent/10 text-accent"
                      : "bg-secondary text-muted-foreground"
                  )}>
                    {log.action}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{log.userEmail ?? "System"}</span>
                    {" · "}
                    <span className="text-muted-foreground">
                      {getAuditActionLabel(log.action as Parameters<typeof getAuditActionLabel>[0])}
                    </span>
                    {log.targetName && (
                      <span className="text-foreground"> — {log.targetName}</span>
                    )}
                  </p>
                  {log.isImpersonated && (
                    <p className="text-[11px] text-accent mt-0.5">
                      Performed while impersonating · Admin: {log.impersonatorEmail}
                    </p>
                  )}
                  {log.ipAddress && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">IP: {log.ipAddress}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
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
