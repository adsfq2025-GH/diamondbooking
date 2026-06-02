// src/components/superadmin/plan-config-table.tsx
"use client";

import { useMemo, useState } from "react";
import type { PlanConfig } from "@prisma/client";

export function PlanConfigTable({ plans }: { plans: PlanConfig[] }) {
  const rows = useMemo(() => {
    return plans.map((p) => ({
      id: p.id,
      plan: p.plan,
      displayName: p.displayName,
      priceMonthly: Number(p.priceMonthly),
      priceYearly: Number(p.priceYearly),
      maxStaff: p.maxStaff,
      maxServices: p.maxServices,
      maxBookingsPerMonth: p.maxBookingsPerMonth,
      removesBranding: p.removesBranding,
      emailReminders: p.emailReminders,
      customDomain: p.customDomain,
      apiAccess: p.apiAccess,
      prioritySupport: p.prioritySupport,
      featuresText: (p.features ?? []).join("\n"),
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    }));
  }, [plans]);

  const [state, setState] = useState(rows);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<(typeof state)[number]>) => {
    setState((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const saveRow = async (id: string) => {
    setSavingId(id);
    setSavedId(null);
    setErrorId(null);
    try {
      const row = state.find((r) => r.id === id);
      if (!row) return;
      const res = await fetch(`/api/superadmin/plan-configs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: row.displayName,
          priceMonthly: Number(row.priceMonthly) || 0,
          priceYearly: Number(row.priceYearly) || 0,
          maxStaff: Number(row.maxStaff),
          maxServices: Number(row.maxServices),
          maxBookingsPerMonth: Number(row.maxBookingsPerMonth),
          removesBranding: !!row.removesBranding,
          emailReminders: !!row.emailReminders,
          customDomain: !!row.customDomain,
          apiAccess: !!row.apiAccess,
          prioritySupport: !!row.prioritySupport,
          features: row.featuresText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          isActive: !!row.isActive,
          sortOrder: Number(row.sortOrder) || 0,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to save");
      setSavedId(id);
      setTimeout(() => setSavedId(null), 1200);
    } catch {
      setErrorId(id);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Plan</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Display</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Monthly</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Yearly</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Staff</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Services</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Bookings/mo</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Branding</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Reminders</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Custom Domain</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">API</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Priority Support</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Features (pricing page)</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Active</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Sort</th>
            <th className="py-2 text-xs font-medium text-muted-foreground">Save</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {state.map((p) => (
            <tr key={p.id} className="align-top">
              <td className="py-3 pr-3 text-xs text-muted-foreground font-medium">{p.plan}</td>
              <td className="py-3 pr-3">
                <input
                  value={p.displayName}
                  onChange={(e) => update(p.id, { displayName: e.target.value })}
                  className="w-36 px-2 py-1 text-sm bg-secondary border border-border rounded-lg text-foreground"
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="number"
                  value={p.priceMonthly}
                  onChange={(e) => update(p.id, { priceMonthly: Number(e.target.value) })}
                  className="w-24 px-2 py-1 text-sm bg-secondary border border-border rounded-lg text-foreground"
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="number"
                  value={p.priceYearly}
                  onChange={(e) => update(p.id, { priceYearly: Number(e.target.value) })}
                  className="w-24 px-2 py-1 text-sm bg-secondary border border-border rounded-lg text-foreground"
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="number"
                  value={p.maxStaff}
                  onChange={(e) => update(p.id, { maxStaff: Number(e.target.value) })}
                  className="w-20 px-2 py-1 text-sm bg-secondary border border-border rounded-lg text-foreground"
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="number"
                  value={p.maxServices}
                  onChange={(e) => update(p.id, { maxServices: Number(e.target.value) })}
                  className="w-20 px-2 py-1 text-sm bg-secondary border border-border rounded-lg text-foreground"
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="number"
                  value={p.maxBookingsPerMonth}
                  onChange={(e) => update(p.id, { maxBookingsPerMonth: Number(e.target.value) })}
                  className="w-24 px-2 py-1 text-sm bg-secondary border border-border rounded-lg text-foreground"
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="checkbox"
                  checked={p.removesBranding}
                  onChange={(e) => update(p.id, { removesBranding: e.target.checked })}
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="checkbox"
                  checked={p.emailReminders}
                  onChange={(e) => update(p.id, { emailReminders: e.target.checked })}
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="checkbox"
                  checked={p.customDomain}
                  onChange={(e) => update(p.id, { customDomain: e.target.checked })}
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="checkbox"
                  checked={p.apiAccess}
                  onChange={(e) => update(p.id, { apiAccess: e.target.checked })}
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="checkbox"
                  checked={p.prioritySupport}
                  onChange={(e) => update(p.id, { prioritySupport: e.target.checked })}
                />
              </td>
              <td className="py-3 pr-3">
                <textarea
                  value={p.featuresText}
                  onChange={(e) => update(p.id, { featuresText: e.target.value })}
                  rows={4}
                  className="w-60 px-2 py-1 text-xs bg-secondary border border-border rounded-lg text-foreground"
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="checkbox"
                  checked={p.isActive}
                  onChange={(e) => update(p.id, { isActive: e.target.checked })}
                />
              </td>
              <td className="py-3 pr-3">
                <input
                  type="number"
                  value={p.sortOrder}
                  onChange={(e) => update(p.id, { sortOrder: Number(e.target.value) })}
                  className="w-16 px-2 py-1 text-sm bg-secondary border border-border rounded-lg text-foreground"
                />
              </td>
              <td className="py-3">
                <button
                  type="button"
                  onClick={() => void saveRow(p.id)}
                  disabled={savingId === p.id}
                  className="px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-border disabled:opacity-50"
                >
                  {savingId === p.id ? "Saving..." : savedId === p.id ? "✓ Saved" : errorId === p.id ? "Retry" : "Save"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
