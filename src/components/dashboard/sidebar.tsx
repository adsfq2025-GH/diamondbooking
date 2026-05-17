// src/components/dashboard/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, BookOpen, Scissors,
  Users, UserCheck, Settings, CreditCard, LogOut,
  ExternalLink, ChevronRight, BadgePercent, DollarSign, Crown, Zap,
} from "lucide-react";
import Image from "next/image";

const APP_ICON_SRC = "/brand/logohead.webp";

const NAV = [
  { href: "/dashboard",           label: "Overview",    icon: LayoutDashboard, exact: true },
  { href: "/dashboard/calendar",  label: "Calendar",    icon: CalendarDays },
  { href: "/dashboard/bookings",  label: "Bookings",    icon: BookOpen },
  { href: "/dashboard/services",  label: "Services",    icon: Scissors },
  { href: "/dashboard/staff",     label: "Staff",       icon: Users },
  { href: "/dashboard/clients",   label: "Clients",     icon: UserCheck },
  { href: "/dashboard/pricing",   label: "Pricing",     icon: DollarSign },
  { href: "/dashboard/promotions",label: "Promotions",  icon: BadgePercent },
  { href: "/dashboard/memberships",label:"Memberships", icon: Crown },
  { href: "/dashboard/automations",label:"Automations", icon: Zap },
  { href: "/dashboard/settings",  label: "Settings",    icon: Settings },
  { href: "/dashboard/billing",   label: "Billing",     icon: CreditCard },
];

interface SidebarProps {
  business: { id: string; name: string; slug: string; logoUrl: string | null } | null;
  user: { name?: string | null; email?: string | null };
}

export function DashboardSidebar({ business, user }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-border bg-card min-h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border">
        {business?.logoUrl ? (
          <Image src={business.logoUrl} alt={business.name} width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
        ) : (
          <Image
            src={APP_ICON_SRC}
            alt="Diamond Booking"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg object-contain"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-heading text-foreground truncate">
            {business?.name ?? "Diamond Booking"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">Booking Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}

        {/* Booking page link */}
        {business && (
          <div className="pt-3 mt-2 border-t border-border">
            <a
              href={`/book/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all group"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="flex-1">View Booking Page</span>
            </a>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {getInitials(user.name ?? user.email ?? "U")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
