"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = { "/staff": "Overview", "/staff/schedule": "Schedule" };

function normalize(pathname: string) {
  if (!pathname.startsWith("/b/")) return pathname;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 3) return pathname;
  if (parts[0] !== "b") return pathname;
  return `/${parts.slice(2).join("/")}`;
}

export function StaffHeader() {
  const pathname = usePathname();
  const normalized = normalize(pathname);
  const basePath = Object.keys(TITLES).filter((k) => normalized.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  const title = TITLES[basePath] ?? "Staff";

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card shrink-0">
      <h1 className="text-base font-semibold font-heading text-foreground">{title}</h1>
      <div />
    </header>
  );
}
