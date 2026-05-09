// src/components/dashboard/header.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLES: Record<string, { title: string; action?: { label: string; href: string } }> = {
  "/dashboard": { title: "Overview" },
  "/dashboard/calendar": { title: "Calendar" },
  "/dashboard/bookings": { title: "Bookings", action: { label: "New Booking", href: "/dashboard/bookings/new" } },
  "/dashboard/services": { title: "Services", action: { label: "Add Service", href: "/dashboard/services/new" } },
  "/dashboard/staff": { title: "Staff", action: { label: "Add Staff", href: "/dashboard/staff/new" } },
  "/dashboard/clients": { title: "Clients", action: { label: "Add Client", href: "/dashboard/clients/new" } },
  "/dashboard/settings": { title: "Settings" },
  "/dashboard/billing": { title: "Billing & Subscription" },
};

interface HeaderProps {
  business: { name: string; slug: string } | null;
  user: { name?: string | null };
}

export function DashboardHeader({ business: _ }: HeaderProps) {
  const pathname = usePathname();
  const basePath = Object.keys(TITLES).filter((k) => pathname.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  const config = TITLES[basePath] ?? { title: "Dashboard" };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card shrink-0">
      <h1 className="text-base font-semibold font-heading text-foreground">{config.title}</h1>
      <div className="flex items-center gap-2">
        {config.action && (
          <Button asChild size="sm" variant="gold">
            <Link href={config.action.href}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {config.action.label}
            </Link>
          </Button>
        )}
        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

// src/components/dashboard/maintenance-banner.tsx
export function MaintenanceBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 text-xs font-medium text-center py-1.5">
      🔧 Diamond Booking is currently in maintenance mode. Some features may be unavailable.
    </div>
  );
}
