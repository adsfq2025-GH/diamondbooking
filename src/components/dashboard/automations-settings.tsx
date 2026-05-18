"use client";

import { useEffect, useMemo, useState } from "react";
import { getAutomationsConfig, type AutomationsConfig } from "@/lib/automations/config";

type ConfigResponse = {
  industryKey: string;
  config: unknown;
  pricingVersion: number;
  updatedAt: string;
} | null;

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function humanMinutes(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

export function AutomationsSettings(props: { emailReady: boolean; smsReady: boolean; cronSecretSet: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<Pick<NonNullable<ConfigResponse>, "industryKey" | "pricingVersion"> | null>(null);
  const [raw, setRaw] = useState<Record<string, unknown>>({});
  const [cfg, setCfg] = useState<AutomationsConfig>(() => getAutomationsConfig({}));

  const safeCfg = useMemo(() => getAutomationsConfig({ ...raw, notifications: cfg.notifications }), [raw, cfg.notifications]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/business/config");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load config");
        const data = (json.data ?? null) as ConfigResponse;
        setMeta(data ? { industryKey: data.industryKey, pricingVersion: data.pricingVersion } : null);
        const obj = asObject(data?.config ?? {});
        setRaw(obj);
        setCfg(getAutomationsConfig(obj));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load config");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const nextConfig = { ...raw, notifications: safeCfg.notifications };
      const res = await fetch("/api/business/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: nextConfig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save config");
      const data = (json.data ?? null) as ConfigResponse;
      setMeta(data ? { industryKey: data.industryKey, pricingVersion: data.pricingVersion } : null);
      const obj = asObject(data?.config ?? {});
      setRaw(obj);
      setCfg(getAutomationsConfig(obj));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const smsEnabled = safeCfg.notifications.sms;
  const emailEnabled = safeCfg.notifications.email;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold font-heading">Notification Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure email + SMS confirmations, cancellations, reminders, and follow-ups.
          </p>
        </div>
        {meta && (
          <div className="text-xs text-muted-foreground text-right">
            <div>Industry: {meta.industryKey}</div>
            <div>Version: v{meta.pricingVersion}</div>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-sm font-semibold">Email provider</div>
          <div className="text-xs text-muted-foreground mt-1">{props.emailReady ? "Ready" : "Missing Resend env vars"}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-sm font-semibold">SMS provider</div>
          <div className="text-xs text-muted-foreground mt-1">{props.smsReady ? "Ready" : "Missing Twilio env vars"}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-sm font-semibold">Cron secret</div>
          <div className="text-xs text-muted-foreground mt-1">{props.cronSecretSet ? "Set" : "Not set"}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Channels</div>
            <div className="text-xs text-muted-foreground">Global enable/disable for sending.</div>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) =>
                  setCfg((p) => ({
                    ...p,
                    notifications: { ...p.notifications, email: e.target.checked },
                  }))
                }
              />
              Email
            </label>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) =>
                  setCfg((p) => ({
                    ...p,
                    notifications: { ...p.notifications, sms: e.target.checked },
                  }))
                }
              />
              SMS
            </label>
          </div>
        </div>

        {emailEnabled && !props.emailReady && (
          <div className="text-xs text-amber-600">
            Email is enabled but Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.
          </div>
        )}
        {smsEnabled && !props.smsReady && (
          <div className="text-xs text-amber-600">
            SMS is enabled but Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-sm font-semibold">Booking confirmation</div>
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <label className="text-sm flex items-center justify-between">
              <span>Email confirmation</span>
              <input
                type="checkbox"
                checked={safeCfg.notifications.confirmation.email}
                onChange={(e) =>
                  setCfg((p) => ({
                    ...p,
                    notifications: {
                      ...p.notifications,
                      confirmation: { ...p.notifications.confirmation, email: e.target.checked },
                    },
                  }))
                }
              />
            </label>
            <label className="text-sm flex items-center justify-between">
              <span>SMS confirmation</span>
              <input
                type="checkbox"
                checked={safeCfg.notifications.confirmation.sms}
                onChange={(e) =>
                  setCfg((p) => ({
                    ...p,
                    notifications: {
                      ...p.notifications,
                      confirmation: { ...p.notifications.confirmation, sms: e.target.checked },
                    },
                  }))
                }
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold">Booking cancellation</div>
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <label className="text-sm flex items-center justify-between">
              <span>Email cancellation</span>
              <input
                type="checkbox"
                checked={safeCfg.notifications.cancellation.email}
                onChange={(e) =>
                  setCfg((p) => ({
                    ...p,
                    notifications: {
                      ...p.notifications,
                      cancellation: { ...p.notifications.cancellation, email: e.target.checked },
                    },
                  }))
                }
              />
            </label>
            <label className="text-sm flex items-center justify-between">
              <span>SMS cancellation</span>
              <input
                type="checkbox"
                checked={safeCfg.notifications.cancellation.sms}
                onChange={(e) =>
                  setCfg((p) => ({
                    ...p,
                    notifications: {
                      ...p.notifications,
                      cancellation: { ...p.notifications.cancellation, sms: e.target.checked },
                    },
                  }))
                }
              />
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Reminders</div>
            <div className="text-xs text-muted-foreground">
              Creates scheduled notifications before each booking. Multiple offsets are supported.
            </div>
          </div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={safeCfg.notifications.reminders.enabled}
              onChange={(e) =>
                setCfg((p) => ({
                  ...p,
                  notifications: {
                    ...p.notifications,
                    reminders: { ...p.notifications.reminders, enabled: e.target.checked },
                  },
                }))
              }
            />
            Enabled
          </label>
        </div>

        {safeCfg.notifications.reminders.enabled && (
          <div className="space-y-2">
            {(safeCfg.notifications.reminders.offsetsMinutes ?? []).map((m, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={m}
                  onChange={(e) =>
                    setCfg((p) => {
                      const offsets = [...(p.notifications.reminders.offsetsMinutes ?? [])];
                      offsets[idx] = Math.max(1, Math.floor(Number(e.target.value) || 1));
                      return {
                        ...p,
                        notifications: { ...p.notifications, reminders: { ...p.notifications.reminders, offsetsMinutes: offsets } },
                      };
                    })
                  }
                  className="w-40 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
                <div className="text-xs text-muted-foreground w-16">{humanMinutes(m)}</div>
                <button
                  type="button"
                  className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted"
                  onClick={() =>
                    setCfg((p) => {
                      const offsets = [...(p.notifications.reminders.offsetsMinutes ?? [])];
                      offsets.splice(idx, 1);
                      return {
                        ...p,
                        notifications: { ...p.notifications, reminders: { ...p.notifications.reminders, offsetsMinutes: offsets } },
                      };
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
              onClick={() =>
                setCfg((p) => ({
                  ...p,
                  notifications: {
                    ...p.notifications,
                    reminders: {
                      ...p.notifications.reminders,
                      offsetsMinutes: [...(p.notifications.reminders.offsetsMinutes ?? []), 1440],
                    },
                  },
                }))
              }
            >
              Add offset
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Follow-up</div>
            <div className="text-xs text-muted-foreground">Creates a scheduled notification after a booking is marked completed.</div>
          </div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={safeCfg.notifications.followUp.enabled}
              onChange={(e) =>
                setCfg((p) => ({
                  ...p,
                  notifications: {
                    ...p.notifications,
                    followUp: { ...p.notifications.followUp, enabled: e.target.checked },
                  },
                }))
              }
            />
            Enabled
          </label>
        </div>

        {safeCfg.notifications.followUp.enabled && (
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Offset minutes</label>
              <input
                type="number"
                min={1}
                value={safeCfg.notifications.followUp.offsetMinutes}
                onChange={(e) =>
                  setCfg((p) => ({
                    ...p,
                    notifications: {
                      ...p.notifications,
                      followUp: { ...p.notifications.followUp, offsetMinutes: Math.max(1, Math.floor(Number(e.target.value) || 1)) },
                    },
                  }))
                }
                className="w-40 px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div className="text-xs text-muted-foreground mt-6">{humanMinutes(safeCfg.notifications.followUp.offsetMinutes)}</div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save Automations"}
        </button>
      </div>
    </div>
  );
}

