// src/components/superadmin/admin-header.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Search } from "lucide-react";
import { debounce, formatRelative } from "@/lib/utils";

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
  "/superadmin/stripe-diagnostics": "Stripe Diagnostics",
};

interface AdminHeaderProps {
  user: { name?: string | null };
}

export function AdminHeader({ user: _ }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const basePath = Object.keys(BREADCRUMBS)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];

  const title = BREADCRUMBS[basePath] ?? "Admin";

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    businesses: Array<{ id: string; name: string; slug: string }>;
    users: Array<{ id: string; email: string; name: string | null; role: string }>;
  }>({ businesses: [], users: [] });
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; action: string; targetType: string; targetId: string; targetName: string | null; createdAt: string }>
  >([]);

  const closeAll = useCallback(() => {
    setSearchOpen(false);
    setNotifOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setNotifOpen(false);
        setSearchOpen(true);
        return;
      }
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAll]);

  useEffect(() => {
    if (!searchOpen) return;
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [searchOpen]);

  const doSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        const query = q.trim();
        if (!query) {
          setSearchResults({ businesses: [], users: [] });
          setSearchLoading(false);
          return;
        }
        setSearchLoading(true);
        try {
          const res = await fetch(`/api/superadmin/search?q=${encodeURIComponent(query)}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error ?? "Search failed");
          setSearchResults(json.data);
        } catch {
          setSearchResults({ businesses: [], users: [] });
        } finally {
          setSearchLoading(false);
        }
      }, 200),
    []
  );

  useEffect(() => {
    if (!searchOpen) return;
    doSearch(searchQuery);
  }, [searchQuery, searchOpen, doSearch]);

  const openNotifications = useCallback(async () => {
    setSearchOpen(false);
    setNotifOpen((v) => !v);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const load = async () => {
      setNotifLoading(true);
      try {
        const res = await fetch("/api/superadmin/notifications");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed");
        setNotifications(json.data);
      } catch {
        setNotifications([]);
      } finally {
        setNotifLoading(false);
      }
    };
    void load();
  }, [notifOpen]);

  const hasNotifications = notifications.length > 0;

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold font-heading text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 relative">
        <button
          type="button"
          onClick={() => {
            setNotifOpen(false);
            setSearchOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground text-sm hover:text-foreground transition-colors w-48"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-border px-1 rounded">⌘K</kbd>
        </button>

        <button
          type="button"
          onClick={openNotifications}
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Bell className="w-4 h-4" />
          {hasNotifications && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 w-[360px] rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Recent activity</div>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false);
                  router.push("/superadmin/audit-log");
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                View all
              </button>
            </div>
            <div className="max-h-[360px] overflow-auto">
              {notifLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No notifications yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        router.push("/superadmin/audit-log");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors"
                    >
                      <div className="text-sm font-medium text-foreground">{n.action}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {n.targetType}: {n.targetName ?? n.targetId} · {formatRelative(n.createdAt)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {searchOpen && (
        <div
          className="fixed inset-0 z-50"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute left-1/2 top-[12vh] w-[92vw] max-w-[720px] -translate-x-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search businesses, slugs, users, emails…"
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
              {searchLoading && <div className="text-xs text-muted-foreground">Searching…</div>}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Esc
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              <div className="p-4 space-y-4">
                {searchResults.businesses.length === 0 && searchResults.users.length === 0 && searchQuery.trim() ? (
                  <div className="text-sm text-muted-foreground">No results.</div>
                ) : (
                  <>
                    {searchResults.businesses.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-2">Businesses</div>
                        <div className="space-y-1">
                          {searchResults.businesses.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchQuery("");
                                router.push(`/superadmin/businesses/${b.id}`);
                              }}
                              className="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-secondary hover:bg-border transition-colors"
                            >
                              <div className="text-sm font-medium text-foreground truncate">{b.name}</div>
                              <div className="text-xs text-muted-foreground font-mono truncate ml-3">{b.slug}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.users.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-2">Users</div>
                        <div className="space-y-1">
                          {searchResults.users.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchQuery("");
                                router.push(`/superadmin/users/${u.id}`);
                              }}
                              className="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-secondary hover:bg-border transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{u.name ?? u.email}</div>
                                <div className="text-xs text-muted-foreground font-mono truncate">{u.email}</div>
                              </div>
                              <div className="text-xs text-muted-foreground ml-3">{u.role}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!searchQuery.trim() && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Businesses", href: "/superadmin/businesses" },
                      { label: "Users", href: "/superadmin/users" },
                      { label: "Audit Log", href: "/superadmin/audit-log" },
                      { label: "System Health", href: "/superadmin/system" },
                    ].map((x) => (
                      <button
                        key={x.href}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          router.push(x.href);
                        }}
                        className="rounded-lg px-3 py-2 bg-secondary hover:bg-border transition-colors text-left"
                      >
                        <div className="text-sm font-semibold text-foreground">{x.label}</div>
                        <div className="text-xs text-muted-foreground">{x.href}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
