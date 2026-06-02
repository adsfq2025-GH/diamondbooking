"use client";

import { useMemo, useState } from "react";
import type { Subscription } from "@prisma/client";
import { ToggleSwitch } from "@/components/superadmin/toggle-switch";

const FEATURE_KEYS = ["removesBranding", "emailReminders", "customDomain", "apiAccess", "prioritySupport"] as const;
type FeatureKey = (typeof FEATURE_KEYS)[number];

type FeatureOverride = { enabled: boolean; expiresAt?: string | null };

const FEATURE_LABELS: Record<FeatureKey, { label: string; description: string }> = {
  removesBranding: { label: "White label / Remove branding", description: "Hide Diamond Booking branding in customer-facing UI." },
  emailReminders: { label: "Email reminders", description: "Send email reminders and confirmations." },
  customDomain: { label: "Custom domain", description: "Use a custom domain for booking pages/widgets." },
  apiAccess: { label: "API access", description: "Enable API access for integrations." },
  prioritySupport: { label: "Priority support", description: "Priority support and faster response." },
};

function toDateInputValue(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInputValue(v: string) {
  if (!v) return null;
  const d = new Date(`${v}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeOverrides(v: unknown): Record<string, FeatureOverride> {
  if (!v || typeof v !== "object") return {};
  return v as Record<string, FeatureOverride>;
}

export function SubscriptionOverridesForm({
  businessId,
  subscription,
}: {
  businessId: string;
  subscription: Subscription | null;
}) {
  const initialOverrides = useMemo(
    () => normalizeOverrides(subscription?.featureOverrides),
    [subscription?.featureOverrides]
  );

  const [isComped, setIsComped] = useState<boolean>(subscription?.isComped ?? false);
  const [compExpiresAt, setCompExpiresAt] = useState<string>(toDateInputValue(subscription?.compExpiresAt ?? null));
  const [compNote, setCompNote] = useState<string>(subscription?.compNote ?? "");
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, FeatureOverride>>(initialOverrides);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>("");

  const setFeature = (key: FeatureKey, enabled: boolean) => {
    setFeatureOverrides((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { enabled }), enabled },
    }));
  };

  const setFeatureExpiry = (key: FeatureKey, dateValue: string) => {
    const iso = fromDateInputValue(dateValue);
    setFeatureOverrides((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { enabled: true }), expiresAt: iso },
    }));
  };

  const clearFeature = (key: FeatureKey) => {
    setFeatureOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const compIso = fromDateInputValue(compExpiresAt);
      const res = await fetch(`/api/superadmin/businesses/${businessId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isComped,
          compExpiresAt: compExpiresAt ? compIso : null,
          compNote: compNote.trim() ? compNote.trim() : null,
          featureOverrides,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Subscription Overrides</h3>
        <p className="text-xs text-muted-foreground mt-1">Super Admin only. Overrides can be time-limited or indefinite.</p>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-foreground">Free mode (Comped)</div>
            <div className="text-xs text-muted-foreground">Ignores billing status while active.</div>
          </div>
          <ToggleSwitch checked={isComped} onChange={setIsComped} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Comp expires (optional)</label>
            <input
              type="date"
              value={compExpiresAt}
              onChange={(e) => setCompExpiresAt(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              disabled={!isComped}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Comp note (optional)</label>
            <input
              value={compNote}
              onChange={(e) => setCompNote(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              placeholder="e.g. courtesy extension"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feature Overrides</div>
        <div className="space-y-2">
          {FEATURE_KEYS.map((key) => {
            const o = featureOverrides[key];
            const enabled = o ? o.enabled : null;
            const expiry = o?.expiresAt ? toDateInputValue(new Date(o.expiresAt)) : "";
            const meta = FEATURE_LABELS[key];
            return (
              <div key={key} className="rounded-lg border border-border bg-secondary p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-foreground">{meta.label}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-border"
                      onClick={() => clearFeature(key)}
                      disabled={!o}
                    >
                      Use plan default
                    </button>
                    <ToggleSwitch
                      checked={enabled === null ? false : enabled}
                      onChange={(v) => setFeature(key, v)}
                    />
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{meta.description}</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Override mode</label>
                    <select
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
                      value={enabled === null ? "none" : enabled ? "on" : "off"}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "none") clearFeature(key);
                        else setFeature(key, v === "on");
                      }}
                    >
                      <option value="none">Plan default</option>
                      <option value="on">Force ON</option>
                      <option value="off">Force OFF</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expires (optional)</label>
                    <input
                      type="date"
                      value={expiry}
                      onChange={(e) => setFeatureExpiry(key, e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
                      disabled={!o}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="w-full px-3 py-2 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-border disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving..." : saved ? "✓ Saved" : "Save Overrides"}
      </button>
    </div>
  );
}
