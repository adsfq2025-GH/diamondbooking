// src/components/superadmin/stat-card.tsx
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // percentage change
  changeLabel?: string;
  icon?: LucideIcon;
  accent?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  accent,
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border p-5 flex flex-col gap-3",
        accent && "border-accent/30 bg-accent/5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
        {Icon && (
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              accent ? "bg-accent/20" : "bg-secondary"
            )}
          >
            <Icon
              className={cn("w-4 h-4", accent ? "text-accent" : "text-muted-foreground")}
            />
          </div>
        )}
      </div>

      <div>
        <p
          className={cn(
            "text-2xl font-bold font-heading",
            accent ? "text-accent" : "text-foreground"
          )}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : isNegative ? (
            <TrendingDown className="w-3 h-3 text-red-500" />
          ) : (
            <Minus className="w-3 h-3 text-muted-foreground" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              isPositive && "text-green-500",
              isNegative && "text-red-500",
              !isPositive && !isNegative && "text-muted-foreground"
            )}
          >
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}% {changeLabel ?? "vs last month"}
          </span>
        </div>
      )}
    </div>
  );
}
