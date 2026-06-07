import { prisma } from "@/lib/prisma";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const metadata = { title: "Stripe Diagnostics" };
export const dynamic = "force-dynamic";

function mask(id: string) {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

async function stripeGet(path: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, status: 0, json: null as any };
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

async function buildDiagnostics() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? null;
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? null;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? null;
  const stripeConnectClientId = process.env.STRIPE_CONNECT_CLIENT_ID ?? null;

  const mode =
    stripeSecretKey?.startsWith("sk_live_") ? "live" : stripeSecretKey?.startsWith("sk_test_") ? "test" : "unknown";

  const priceEnv = [
    ["STARTER monthly", process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null],
    ["PRO monthly", process.env.STRIPE_PRICE_PRO_MONTHLY ?? null],
    ["ENTERPRISE monthly", process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? null],
    ["STARTER yearly", process.env.STRIPE_PRICE_STARTER_YEARLY ?? null],
    ["PRO yearly", process.env.STRIPE_PRICE_PRO_YEARLY ?? null],
    ["ENTERPRISE yearly", process.env.STRIPE_PRICE_ENTERPRISE_YEARLY ?? null],
  ] as const;

  const account = await stripeGet("/account");

  const prices = await Promise.all(
    priceEnv.map(async ([label, priceId]) => {
      if (!priceId) return { label, priceId, ok: false, status: 0, name: null as string | null, currency: null as string | null, unitAmount: null as number | null };
      const res = await stripeGet(`/prices/${encodeURIComponent(priceId)}`);
      const obj = res.json as any;
      return {
        label,
        priceId,
        ok: res.ok,
        status: res.status,
        name: typeof obj?.nickname === "string" ? obj.nickname : typeof obj?.id === "string" ? obj.id : null,
        currency: typeof obj?.currency === "string" ? obj.currency : null,
        unitAmount: typeof obj?.unit_amount === "number" ? obj.unit_amount : null,
      };
    })
  );

  const settings = await prisma.platformSettings.findUnique({
    where: { id: 1 },
    select: { defaultTrialDays: true },
  });

  const recentWebhookEvents = await prisma.stripeWebhookEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { stripeEventId: true, type: true, livemode: true, createdAt: true, processed: true, errorMessage: true },
  });

  return {
    env: {
      appUrl,
      mode,
      stripeSecretKeySet: !!stripeSecretKey,
      stripePublishableKeySet: !!stripePublishableKey,
      stripeWebhookSecretSet: !!stripeWebhookSecret,
      stripeConnectClientIdSet: !!stripeConnectClientId,
    },
    platform: {
      defaultTrialDays: settings?.defaultTrialDays ?? 14,
    },
    stripe: {
      accountOk: account.ok,
      accountStatus: account.status,
      livemode: typeof (account.json as any)?.livemode === "boolean" ? (account.json as any).livemode : null,
      accountId: typeof (account.json as any)?.id === "string" ? (account.json as any).id : null,
    },
    prices,
    recentWebhookEvents,
  };
}

export default async function StripeDiagnosticsPage() {
  const data = await buildDiagnostics();

  const StatusIcon = ({ ok, warn }: { ok: boolean; warn?: boolean }) =>
    ok ? <CheckCircle className="w-5 h-5 text-green-400" /> : warn ? <AlertCircle className="w-5 h-5 text-yellow-400" /> : <XCircle className="w-5 h-5 text-destructive" />;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground">Stripe Diagnostics</h2>
        <p className="text-sm text-muted-foreground">Validates platform Stripe configuration (billing + Connect).</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Environment</p>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "NEXT_PUBLIC_APP_URL", ok: !!data.env.appUrl, value: data.env.appUrl ?? "Missing" },
            { label: "Stripe Mode", ok: data.env.mode === "test", warn: data.env.mode === "unknown", value: data.env.mode },
            { label: "STRIPE_SECRET_KEY", ok: data.env.stripeSecretKeySet, value: data.env.stripeSecretKeySet ? "Set" : "Missing" },
            { label: "STRIPE_PUBLISHABLE_KEY", ok: data.env.stripePublishableKeySet, value: data.env.stripePublishableKeySet ? "Set" : "Missing" },
            { label: "STRIPE_WEBHOOK_SECRET", ok: data.env.stripeWebhookSecretSet, value: data.env.stripeWebhookSecretSet ? "Set" : "Missing" },
            { label: "STRIPE_CONNECT_CLIENT_ID", ok: data.env.stripeConnectClientIdSet, value: data.env.stripeConnectClientIdSet ? "Set" : "Missing" },
            { label: "Default trial days", ok: true, value: String(data.platform.defaultTrialDays) },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <StatusIcon ok={row.ok} warn={row.warn} />
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Stripe Connectivity</p>
        </div>
        <div className="divide-y divide-border">
          {[
            {
              label: "GET /v1/account",
              ok: data.stripe.accountOk,
              value: data.stripe.accountOk
                ? `ok (${data.stripe.accountStatus}) • id=${data.stripe.accountId ? mask(data.stripe.accountId) : "n/a"} • livemode=${String(data.stripe.livemode)}`
                : `failed (${data.stripe.accountStatus})`,
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <StatusIcon ok={row.ok} />
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Price IDs</p>
        </div>
        <div className="divide-y divide-border">
          {data.prices.map((p) => (
            <div key={p.label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <StatusIcon ok={p.ok} warn={!!p.priceId && !p.ok} />
                <div>
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.priceId ? `${p.priceId} (${p.status})` : "Missing env var"}
                    {p.ok && p.currency && typeof p.unitAmount === "number" ? ` • ${p.currency.toUpperCase()} ${(p.unitAmount / 100).toFixed(2)}` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Recent Webhooks</p>
        </div>
        <div className="divide-y divide-border">
          {data.recentWebhookEvents.length ? (
            data.recentWebhookEvents.map((e) => (
              <div key={e.stripeEventId} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{e.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  id={mask(e.stripeEventId)} • livemode={String(e.livemode)} • processed={String(e.processed)}
                  {e.errorMessage ? ` • error=${e.errorMessage}` : ""}
                </p>
              </div>
            ))
          ) : (
            <div className="px-5 py-4 text-sm text-muted-foreground">No webhook events recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

