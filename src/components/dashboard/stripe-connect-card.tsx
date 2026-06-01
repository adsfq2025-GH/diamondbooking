"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

export function StripeConnectCard({
  status,
  returnTo,
  refreshTo,
}: {
  status: null | {
    accountId: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
  returnTo?: string;
  refreshTo?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [configLoaded, setConfigLoaded] = useState(false);
  const [baseConfig, setBaseConfig] = useState<Record<string, any>>({});
  const [paymentMode, setPaymentMode] = useState<"full" | "deposit">("full");
  const [depositPercent, setDepositPercent] = useState<number>(20);
  const [saving, setSaving] = useState(false);

  const redirectToLogin = () => {
    const cb = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.assign(`/auth/login?callbackUrl=${cb}`);
  };

  const ensureAccount = async () => {
    const res = await fetch("/api/connect/account", { method: "POST" });
    if (res.status === 401 || res.status === 403) {
      redirectToLogin();
      throw new Error("Unauthorized");
    }
    const json = (await readJson(res)) as { error?: string; data?: unknown };
    if (!res.ok) throw new Error(json.error ?? "Failed to create Stripe account");
    return (json.data ?? {}) as { accountId: string };
  };

  const startOnboarding = async () => {
    setError("");
    setLoading(true);
    try {
      await ensureAccount();
      const body: Record<string, string> = {};
      if (returnTo) body.returnTo = returnTo;
      if (refreshTo) body.refreshTo = refreshTo;
      const res = await fetch("/api/connect/onboard-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return;
      }
      const json = (await readJson(res)) as { error?: string; data?: { url?: string } };
      if (!res.ok) throw new Error(json.error ?? "Failed to create onboarding link");
      if (!json.data?.url) throw new Error("Missing onboarding URL");
      window.location.assign(json.data.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  const openStripeDashboard = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/connect/login-link", { method: "POST" });
      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return;
      }
      const json = (await readJson(res)) as { error?: string; data?: { url?: string } };
      if (!res.ok) throw new Error(json.error ?? "Failed to create Stripe login link");
      if (!json.data?.url) throw new Error("Missing Stripe dashboard URL");
      window.open(json.data.url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const connected = !!status?.accountId;
  const ready = !!status?.chargesEnabled;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/business/config");
        if (!alive) return;
        const json = (await readJson(res)) as { data?: { config?: unknown } };
        const cfg = (json.data?.config && typeof json.data.config === "object" ? (json.data.config as Record<string, any>) : {}) as Record<string, any>;
        const payments = (cfg.payments && typeof cfg.payments === "object" ? (cfg.payments as Record<string, any>) : {}) as Record<string, any>;
        const mode = payments.mode === "deposit" ? "deposit" : "full";
        const pctRaw = typeof payments.depositPercent === "number" ? payments.depositPercent : 20;
        const pct = Number.isFinite(pctRaw) ? Math.max(1, Math.min(100, Math.floor(pctRaw))) : 20;
        setBaseConfig(cfg);
        setPaymentMode(mode);
        setDepositPercent(pct);
        setConfigLoaded(true);
      } catch {
        setConfigLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const savePaymentSettings = async () => {
    setError("");
    setSaving(true);
    try {
      const payments =
        paymentMode === "deposit"
          ? { mode: "deposit", depositPercent: Math.max(1, Math.min(100, Math.floor(depositPercent))) }
          : { mode: "full" };

      const res = await fetch("/api/business/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { ...baseConfig, payments } }),
      });
      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return;
      }
      const json = (await readJson(res)) as { error?: string; data?: { config?: unknown } };
      if (!res.ok) throw new Error(json.error ?? "Failed to save payment settings");
      const cfg = (json.data?.config && typeof json.data.config === "object" ? (json.data.config as Record<string, any>) : {}) as Record<string, any>;
      setBaseConfig(cfg);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Booking Payments</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your Stripe account so customers can pay you directly during booking.
            </p>
          </div>
          {ready ? <Badge variant="info">Connected</Badge> : connected ? <Badge variant="warning">Action needed</Badge> : <Badge variant="secondary">Not connected</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div className="text-xs text-muted-foreground">
          {ready
            ? "Stripe is connected and charges are enabled."
            : connected
              ? "Finish Stripe onboarding to enable charges and payouts."
              : "Connect Stripe to enable customer payments for bookings."}
        </div>

        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="text-xs font-semibold text-foreground">Charging preference</div>
          <div className="grid gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value === "deposit" ? "deposit" : "full")}
              disabled={!configLoaded || saving}
            >
              <option value="full">Charge full amount online</option>
              <option value="deposit">Charge a deposit percentage</option>
            </select>

            {paymentMode === "deposit" && (
              <div className="flex items-center gap-2">
                <input
                  className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
                  type="number"
                  min={1}
                  max={100}
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(Number(e.target.value))}
                  disabled={!configLoaded || saving}
                />
                <div className="text-sm text-muted-foreground">%</div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={() => void savePaymentSettings()} disabled={!configLoaded || saving} variant="outline" size="sm">
              Save preference
            </Button>
            {!ready && (
              <div className="text-xs text-muted-foreground self-center">
                Connect Stripe to enable online charges.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void startOnboarding()} disabled={loading} variant={ready ? "outline" : "gold"} size="sm">
            {ready ? "Update Stripe details" : "Connect Stripe"}
          </Button>
          {connected && (
            <Button onClick={() => void openStripeDashboard()} disabled={loading} variant="outline" size="sm">
              Open Stripe Dashboard
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
