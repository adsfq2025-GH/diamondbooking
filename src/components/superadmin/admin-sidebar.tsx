// src/components/superadmin/admin-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  CalendarDays,
  Mail,
  ScrollText,
  Settings,
  Activity,
  LogOut,
  ChevronRight,
} from "lucide-react";

const APP_ICON_SRC = "/brand/logohead.webp";

const NAV_ITEMS = [
  { href: "/superadmin",              label: "Overview",            icon: LayoutDashboard,  exact: true  },
  { href: "/superadmin/businesses",   label: "Businesses",          icon: Building2                       },
  { href: "/superadmin/users",        label: "Users",               icon: Users                           },
  { href: "/superadmin/subscriptions",label: "Revenue",             icon: CreditCard                      },
  { href: "/superadmin/bookings",     label: "All Bookings",        icon: CalendarDays                    },
  { href: "/superadmin/emails",       label: "Emails",              icon: Mail                            },
  { href: "/superadmin/audit-log",    label: "Audit Log",           icon: ScrollText                      },
  { href: "/superadmin/settings",     label: "Platform Settings",   icon: Settings                        },
  { href: "/superadmin/system",       label: "System Health",       icon: Activity                        },
  { href: "/superadmin/stripe-diagnostics", label: "Stripe Diagnostics", icon: CreditCard                  },
];

interface AdminSidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 shrink-0 flex flex-col border-r border-border bg-card min-h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-border">
        <Image
          src={APP_ICON_SRC}
          alt="Diamond Booking"
          width={32}
          height={32}
          className="w-8 h-8 rounded-lg object-contain"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-heading text-foreground truncate">
            Diamond Booking
          </p>
          <span className="inline-flex items-center rounded-sm px-1.5 py-0 text-[10px] font-bold tracking-wider bg-accent/20 text-accent">
            ADMIN
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  active ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <ChevronRight className="w-3 h-3 text-accent opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-accent">
              {getInitials(user.name ?? user.email ?? "SA")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {user.name ?? "Super Admin"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
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
