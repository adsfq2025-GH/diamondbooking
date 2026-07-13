"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { buildBookingUrl, buildWidgetEmbedSnippet } from "@/lib/widget-embed";

type EmbedMode = "inline" | "drawer";
type DrawerSide = "left" | "right";

// Drawer is a paid presentation option. An active trial mirrors Professional,
// so trials get it too (kept in sync with src/lib/plan-limits.ts).
function computeDrawerAllowed(sub: {
  plan?: string;
  status?: string;
  trialEnd?: string | null;
} | null): boolean {
  if (!sub) return false;
  const trialActive =
    sub.status === "TRIALING" && (!sub.trialEnd || new Date(sub.trialEnd).getTime() > Date.now());
  const effectivePlan = trialActive ? "PROFESSIONAL" : sub.plan ?? "FREE";
  return effectivePlan === "PROFESSIONAL" || effectivePlan === "ENTERPRISE";
}

export function WidgetAccessCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState<"link" | "snippet" | "">("");
  const [borderRadius, setBorderRadius] = useState("soft");
  const [minHeight, setMinHeight] = useState("920");
  const [title, setTitle] = useState("Book an appointment");
  const [showIcons, setShowIcons] = useState(true);
  const [showLivePricing, setShowLivePricing] = useState(true);

  // Drawer (slide-out) options
  const [embedMode, setEmbedMode] = useState<EmbedMode>("inline");
  const [drawerSide, setDrawerSide] = useState<DrawerSide>("right");
  const [buttonLabel, setButtonLabel] = useState("Book Now");
  const [buttonColor, setButtonColor] = useState("#1a1f36");
  const [drawerWidth, setDrawerWidth] = useState("420");
  const [drawerAllowed, setDrawerAllowed] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Downgrade-safe: only honor drawer mode if the plan currently allows it.
  const effectiveMode: EmbedMode = drawerAllowed && embedMode === "drawer" ? "drawer" : "inline";

  const bookingUrl = useMemo(() => buildBookingUrl(slug), [slug]);
  const previewUrl = useMemo(() => `${bookingUrl}?embed=1&preview=1`, [bookingUrl]);
  const snippet = useMemo(
    () =>
      buildWidgetEmbedSnippet(slug, {
        borderRadius,
        minHeight,
        title,
        mode: effectiveMode,
        side: drawerSide,
        buttonLabel,
        buttonColor,
        width: drawerWidth,
      }),
    [slug, borderRadius, minHeight, title, effectiveMode, drawerSide, buttonLabel, buttonColor, drawerWidth]
  );

  const copy = async (type: "link" | "snippet", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(""), 1200);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [cfgRes, subRes] = await Promise.all([
          fetch("/api/business/config"),
          fetch("/api/billing/subscription"),
        ]);

        const cfgJson = (await cfgRes.json()) as { success: boolean; data?: { config?: unknown } };
        if (cfgRes.ok && cfgJson?.success) {
          const cfg = (cfgJson.data?.config ?? {}) as Record<string, unknown>;
          const widget = (cfg.widget ?? {}) as Record<string, unknown>;
          const ui = (cfg.ui ?? {}) as Record<string, unknown>;

          if (typeof widget.borderRadius === "string") setBorderRadius(widget.borderRadius);
          if (typeof widget.minHeight === "string") setMinHeight(widget.minHeight);
          if (typeof widget.title === "string") setTitle(widget.title);
          if (widget.mode === "drawer" || widget.mode === "inline") setEmbedMode(widget.mode);
          if (widget.side === "left" || widget.side === "right") setDrawerSide(widget.side);
          if (typeof widget.buttonLabel === "string" && widget.buttonLabel.trim()) setButtonLabel(widget.buttonLabel);
          if (typeof widget.buttonColor === "string" && widget.buttonColor.trim()) setButtonColor(widget.buttonColor);
          if (typeof widget.width === "string" && widget.width.trim()) setDrawerWidth(widget.width);
          if (typeof ui.showIcons === "boolean") setShowIcons(ui.showIcons);
          if (typeof ui.showLivePricing === "boolean") setShowLivePricing(ui.showLivePricing);
        }

        const subJson = (await subRes.json()) as {
          success: boolean;
          data?: { plan?: string; status?: string; trialEnd?: string | null } | null;
        };
        if (subRes.ok && subJson?.success) {
          setDrawerAllowed(computeDrawerAllowed(subJson.data ?? null));
        }
      } catch {
      }
    };
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/business/config");
      const json = (await res.json()) as { success: boolean; data?: { config?: unknown } };
      if (!res.ok || !json?.success) throw new Error("Failed to load current settings");

      const current = (json.data?.config ?? {}) as Record<string, unknown>;
      const ui = (current.ui ?? {}) as Record<string, unknown>;

      const next = {
        ...current,
        widget: {
          borderRadius,
          minHeight,
          title,
          mode: effectiveMode,
          side: drawerSide,
          buttonLabel,
          buttonColor,
          width: drawerWidth,
        },
        ui: {
          ...ui,
          showIcons,
          showLivePricing,
        },
      };

      const put = await fetch("/api/business/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: next }),
      });
      const putJson = (await put.json()) as { success?: boolean; error?: string };
      if (!put.ok || !putJson?.success) throw new Error(putJson?.error ?? "Failed to save");
      setSaveMessage("Saved");
      window.setTimeout(() => setSaveMessage(""), 1200);
    } catch (e: unknown) {
      setSaveMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isDrawer = effectiveMode === "drawer";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold font-heading">Booking Widget</h3>
          <p className="text-sm text-muted-foreground">
            Copy your booking page link or embed code anytime.
          </p>
        </div>
      </div>

      {/* Embed type */}
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="text-xs font-medium text-muted-foreground">How it appears on your site</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setEmbedMode("inline")}
            className={`text-left rounded-lg border p-3 transition-colors ${
              !isDrawer ? "border-primary ring-2 ring-primary/15" : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <div className="text-sm font-semibold">Inline</div>
            <div className="text-xs text-muted-foreground mt-0.5">Embeds directly in the page where you place the code.</div>
          </button>

          <button
            type="button"
            disabled={!drawerAllowed}
            onClick={() => drawerAllowed && setEmbedMode("drawer")}
            className={`text-left rounded-lg border p-3 transition-colors relative ${
              isDrawer ? "border-primary ring-2 ring-primary/15" : "border-border hover:border-muted-foreground/40"
            } ${!drawerAllowed ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <div className="text-sm font-semibold">Slide-out drawer</div>
              {!drawerAllowed && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              A launcher button opens a booking panel — customers book without leaving the page.
            </div>
            {!drawerAllowed && (
              <div className="text-[11px] font-semibold text-amber-600 mt-1.5">
                Available on Professional &amp; Enterprise
              </div>
            )}
          </button>
        </div>

        {isDrawer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Opens from</label>
              <div className="grid grid-cols-2 gap-2">
                {(["left", "right"] as DrawerSide[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDrawerSide(s)}
                    className={`py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                      drawerSide === s ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Drawer width (px)</label>
              <input
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                value={drawerWidth}
                onChange={(e) => setDrawerWidth(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Button label</label>
              <input
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Button color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="h-9 w-11 rounded-md border border-border bg-background"
                />
                <input
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Widget customization */}
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Widget customization</div>
            <div className="text-sm text-muted-foreground">These settings also apply to the live booking page.</div>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && <div className="text-xs text-muted-foreground">{saveMessage}</div>}
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Border radius</label>
            <select
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              value={borderRadius}
              onChange={(e) => setBorderRadius(e.target.value)}
            >
              <option value="sharp">Sharp</option>
              <option value="soft">Soft</option>
              <option value="pill">Pill</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Min height (px)</label>
            <input
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background disabled:opacity-50"
              value={minHeight}
              onChange={(e) => setMinHeight(e.target.value)}
              inputMode="numeric"
              disabled={isDrawer}
              title={isDrawer ? "Not used in drawer mode (drawer is full height)" : undefined}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Widget title</label>
            <input
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showIcons} onChange={(e) => setShowIcons(e.target.checked)} />
            Show add-on icons
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showLivePricing} onChange={(e) => setShowLivePricing(e.target.checked)} />
            Show live pricing
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-muted-foreground">Booking page</div>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => void copy("link", bookingUrl)}
          >
            {copied === "link" ? "Copied" : "Copy link"}
          </button>
        </div>
        <div className="text-sm break-all">{bookingUrl}</div>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-muted-foreground">
            Embed code{isDrawer ? ` — slide-out drawer (${drawerSide})` : ""}
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => void copy("snippet", snippet)}
          >
            {copied === "snippet" ? "Copied" : "Copy code"}
          </button>
        </div>
        <pre className="text-xs whitespace-pre-wrap break-all font-mono">{snippet}</pre>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Live preview</div>
        {isDrawer && (
          <div className="text-xs text-muted-foreground">
            In drawer mode a “{buttonLabel}” button sits fixed in the bottom-{drawerSide} corner of your site and slides
            this panel out when clicked. Preview of the panel contents:
          </div>
        )}
        <div
          className="w-full overflow-hidden border border-border bg-background"
          style={{
            borderRadius:
              borderRadius === "sharp"
                ? 4
                : borderRadius === "pill"
                  ? 50
                  : 10,
          }}
        >
          <iframe
            title="Widget preview"
            src={previewUrl}
            style={{ width: "100%", border: 0, minHeight: `${Number(minHeight) || 920}px` }}
            allow="payment; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
}
