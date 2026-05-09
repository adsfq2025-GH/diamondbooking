// src/components/superadmin/admin-header.tsx
"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

const BREADCRUMBS: Record<string, string> = {
  "/superadmin": "Overview",
  "/superadmin/businesses": "Businesses",
  "/superadmin/users": "Users",
  "/superadmin/subscriptions": "Revenue & Subscriptions",
  "/superadmin/bookings": "All Bookings",
  "/superadmin/emails": "Email & Notifications",
  "/superadmin/audit-log": "Audit Log",
  "/superadmin/settings": "Platform Settings",
  "/superadmin/system": "System Health",
};

interface AdminHeaderProps {
  user: { name?: string | null };
}

export function AdminHeader({ user: _ }: AdminHeaderProps) {
  const pathname = usePathname();

  // Get base path for breadcrumb
  const basePath = Object.keys(BREADCRUMBS)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];

  const title = BREADCRUMBS[basePath] ?? "Admin";

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold font-heading text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search trigger */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground text-sm hover:text-foreground transition-colors w-48">
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-border px-1 rounded">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        </button>
      </div>
    </header>
  );
}
