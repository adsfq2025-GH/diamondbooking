"use client";

import { useState } from "react";
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
}: {
  status: null | {
    accountId: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

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
      const res = await fetch("/api/connect/onboard-link", { method: "POST" });
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
