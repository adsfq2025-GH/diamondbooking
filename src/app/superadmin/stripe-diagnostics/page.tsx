import { prisma } from "@/lib/prisma";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Stripe from "stripe";

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

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
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
    ["STARTER (alias)", process.env.STRIPE_PRICE_STARTER ?? null],
    ["STARTER monthly", process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null],
    ["PRO monthly", process.env.STRIPE_PRICE_PRO_MONTHLY ?? null],
    ["ENTERPRISE monthly", process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? null],
    ["STARTER yearly", process.env.STRIPE_PRICE_STARTER_YEARLY ?? null],
    ["PRO yearly", process.env.STRIPE_PRICE_PRO_YEARLY ?? null],
    ["ENTERPRISE yearly", process.env.STRIPE_PRICE_ENTERPRISE_YEARLY ?? null],
    ["PRO (alias)", process.env.STRIPE_PRICE_PRO ?? null],
    ["ENTERPRISE (alias)", process.env.STRIPE_PRICE_ENTERPRISE ?? null],
  ] as const;

  const account = await stripeGet("/account");
  const webhookEndpoints = await stripeGet("/webhook_endpoints?limit=100");

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

  const expectedBillingWebhookUrl = appUrl ? `${appUrl.replace(/\/+$/, "")}/api/billing/webhook` : null;

  const webhookUrlMatch = (() => {
    const list = (webhookEndpoints.json as any)?.data;
    if (!Array.isArray(list) || !expectedBillingWebhookUrl) return { ok: false, found: false, enabled: false };
    const match = list.find((e: any) => typeof e?.url === "string" && e.url === expectedBillingWebhookUrl);
    if (!match) return { ok: true, found: false, enabled: false };
    return { ok: true, found: true, enabled: match.status === "enabled" };
  })();

  const stripe = getStripe();
  const redirectBase = appUrl ? appUrl.replace(/\/+$/, "") : null;
  const redirects = {
    ok: !!redirectBase && /^https:\/\//i.test(redirectBase),
    baseUrl: redirectBase,
    billingSuccess: redirectBase ? `${redirectBase}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}` : null,
    billingCancel: redirectBase ? `${redirectBase}/dashboard/billing?canceled=1` : null,
    connectReturn: redirectBase ? `${redirectBase}/dashboard/billing?connect=return` : null,
    connectRefresh: redirectBase ? `${redirectBase}/dashboard/billing?connect=refresh` : null,
  };

  let customerTest: { ok: boolean; id: string | null; error: string | null } = { ok: false, id: null, error: null };
  let checkoutTest: { ok: boolean; id: string | null; url: string | null; error: string | null } = { ok: false, id: null, url: null, error: null };
  if (stripe && redirects.baseUrl) {
    try {
      const c = await stripe.customers.create({
        description: "Diamond Booking diagnostics",
        metadata: { diagnostics: "1" },
      });
      customerTest = { ok: true, id: c.id, error: null };
      await stripe.customers.del(c.id).catch(() => {});
    } catch (e: unknown) {
      customerTest = { ok: false, id: null, error: e instanceof Error ? e.message : "Customer creation failed" };
    }

    try {
      const s = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: 100,
              product_data: { name: "Diagnostics test" },
            },
          },
        ],
        success_url: `${redirects.baseUrl}/superadmin/stripe-diagnostics?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${redirects.baseUrl}/superadmin/stripe-diagnostics?checkout=cancel`,
      });
      checkoutTest = { ok: true, id: s.id, url: s.url ?? null, error: null };
    } catch (e: unknown) {
      checkoutTest = { ok: false, id: null, url: null, error: e instanceof Error ? e.message : "Checkout session creation failed" };
    }
  }

  const accountLivemode =
    typeof (account.json as any)?.livemode === "boolean" ? (account.json as any).livemode : null;
  const envModeOk =
    mode === "test" ? accountLivemode === false : mode === "live" ? accountLivemode === true : false;

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
      livemode: accountLivemode,
      accountId: typeof (account.json as any)?.id === "string" ? (account.json as any).id : null,
    },
    prices,
    webhook: {
      expectedBillingWebhookUrl,
      endpointsOk: webhookEndpoints.ok,
      endpointsStatus: webhookEndpoints.status,
      billingUrlMatch: webhookUrlMatch,
    },
    redirects,
    tests: {
      stripeCustomerCreate: customerTest,
      checkoutSessionCreate: checkoutTest,
      envModeMatchesAccount: envModeOk,
    },
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
            { label: "Mode matches /v1/account", ok: data.tests.envModeMatchesAccount, warn: data.stripe.livemode == null, value: `account.livemode=${String(data.stripe.livemode)}` },
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
          <p className="text-sm font-semibold text-foreground">Redirect URLs</p>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "Base URL is https", ok: data.redirects.ok, warn: !!data.redirects.baseUrl && !data.redirects.ok, value: data.redirects.baseUrl ?? "Missing" },
            { label: "Billing success_url", ok: !!data.redirects.billingSuccess, value: data.redirects.billingSuccess ?? "n/a" },
            { label: "Billing cancel_url", ok: !!data.redirects.billingCancel, value: data.redirects.billingCancel ?? "n/a" },
            { label: "Connect return_url", ok: !!data.redirects.connectReturn, value: data.redirects.connectReturn ?? "n/a" },
            { label: "Connect refresh_url", ok: !!data.redirects.connectRefresh, value: data.redirects.connectRefresh ?? "n/a" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <StatusIcon ok={row.ok} warn={row.warn} />
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground break-all">{row.value}</p>
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
          <p className="text-sm font-semibold text-foreground">API Smoke Tests</p>
        </div>
        <div className="divide-y divide-border">
          {[
            {
              label: "Stripe customer creation",
              ok: data.tests.stripeCustomerCreate.ok,
              warn: !data.env.stripeSecretKeySet,
              value: data.tests.stripeCustomerCreate.ok ? `ok (deleted)` : data.tests.stripeCustomerCreate.error ?? "skipped",
            },
            {
              label: "Checkout session creation",
              ok: data.tests.checkoutSessionCreate.ok,
              warn: !data.redirects.ok,
              value: data.tests.checkoutSessionCreate.ok ? `ok (id=${data.tests.checkoutSessionCreate.id ? mask(data.tests.checkoutSessionCreate.id) : "n/a"})` : data.tests.checkoutSessionCreate.error ?? "skipped",
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <StatusIcon ok={row.ok} warn={row.warn} />
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground break-all">{row.value}</p>
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
          <p className="text-sm font-semibold text-foreground">Webhook Connectivity</p>
        </div>
        <div className="divide-y divide-border">
          {[
            {
              label: "Webhook endpoints list",
              ok: data.webhook.endpointsOk,
              value: data.webhook.endpointsOk ? "ok" : `failed (${data.webhook.endpointsStatus})`,
            },
            {
              label: "Billing webhook endpoint configured",
              ok: data.webhook.billingUrlMatch.ok && data.webhook.billingUrlMatch.found && data.webhook.billingUrlMatch.enabled,
              warn: data.webhook.billingUrlMatch.ok && !data.webhook.billingUrlMatch.found,
              value: data.webhook.expectedBillingWebhookUrl ?? "Missing NEXT_PUBLIC_APP_URL",
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <StatusIcon ok={row.ok} warn={row.warn} />
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground break-all">{row.value}</p>
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
