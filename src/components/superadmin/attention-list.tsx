// src/components/superadmin/attention-list.tsx
import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttentionBusiness {
  id: string;
  name: string;
  isActive: boolean;
  owner: {
    email: string | null;
    subscription: { plan: string; status: string } | null;
  };
}

export function AttentionList({ businesses }: { businesses: AttentionBusiness[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Needs Attention</p>
          <p className="text-xs text-muted-foreground">Past-due payments & suspended accounts</p>
        </div>
        <Link href="/superadmin/businesses" className="text-xs text-accent hover:underline">
          View all →
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
            <span className="text-green-500 text-lg">✓</span>
          </div>
          <p className="text-sm text-muted-foreground">All businesses are in good standing</p>
        </div>
      ) : (
        <div className="space-y-2">
          {businesses.map((biz) => {
            const isPastDue = biz.owner.subscription?.status === "PAST_DUE";
            const isSuspended = !biz.isActive;

            return (
              <div
                key={biz.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  isPastDue
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-secondary"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle
                    className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      isPastDue ? "text-destructive" : "text-warning"
                    )}
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground">{biz.name}</p>
                    <p className="text-[11px] text-muted-foreground">{biz.owner.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      isPastDue
                        ? "bg-destructive/20 text-destructive"
                        : "bg-yellow-500/20 text-yellow-500"
                    )}
                  >
                    {isPastDue ? "Past Due" : isSuspended ? "Suspended" : "Issue"}
                  </span>
                  <Link href={`/superadmin/businesses/${biz.id}`}>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
