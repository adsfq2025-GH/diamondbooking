// src/components/superadmin/recent-activity.tsx
import { formatRelative } from "@/lib/utils";
import { getAuditActionLabel as auditLabel } from "@/lib/audit";
import Link from "next/link";
import { ScrollText } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  targetName: string | null;
  targetType: string;
  targetId: string;
  createdAt: Date;
  user: { name: string | null; email: string | null } | null;
}

export function RecentActivity({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Recent Activity</p>
          <p className="text-xs text-muted-foreground">Last 20 platform actions</p>
        </div>
        <Link
          href="/superadmin/audit-log"
          className="text-xs text-accent hover:underline"
        >
          View all →
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ScrollText className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-relaxed">
                  <span className="font-medium">
                    {log.user?.name ?? log.user?.email ?? "System"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {auditLabel(log.action as Parameters<typeof auditLabel>[0])}
                  </span>
                  {log.targetName && (
                    <span className="text-foreground"> — {log.targetName}</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatRelative(log.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
