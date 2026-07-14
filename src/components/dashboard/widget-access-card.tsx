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

type WidgetDesign = {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  welcomeMessage?: string;
};

export function WidgetAccessCard({ slug, design }: { slug: string; design?: WidgetDesign }) {
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
  const [buttonColor, setButtonColor] = useState("#0b5c8b");
  const [drawerWidth, setDrawerWidth] = useState("420");
  const [animation, setAnimation] = useState("wiggle");
  const [logoUrl, setLogoUrl] = useState("");
  const [drawerAllowed, setDrawerAllowed] = useState(false);

  // Live preview device
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Downgrade-safe: only honor drawer mode if the plan currently allows it.
  const effectiveMode: EmbedMode = drawerAllowed && embedMode === "drawer" ? "drawer" : "inline";

  const bookingUrl = useMemo(() => buildBookingUrl(slug), [slug]);

  // Debounce design edits so dragging a color picker doesn't reload the
  // preview iframe on every frame.
  const [debouncedDesign, setDebouncedDesign] = useState<WidgetDesign | undefined>(design);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedDesign(design), 300);
    return () => window.clearTimeout(t);
  }, [design?.primaryColor, design?.accentColor, design?.logoUrl, design?.welcomeMessage]);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({ embed: "1", preview: "1" });
    if (debouncedDesign?.primaryColor) params.set("pc", debouncedDesign.primaryColor);
    if (debouncedDesign?.accentColor) params.set("ac", debouncedDesign.accentColor);
    if (debouncedDesign?.logoUrl) params.set("logo", debouncedDesign.logoUrl);
    if (debouncedDesign?.welcomeMessage) params.set("wm", debouncedDesign.welcomeMessage);
    return `${bookingUrl}?${params.toString()}`;
  }, [bookingUrl, debouncedDesign]);
  const snippet = useMemo(
    () =>
      buildWidgetEmbedSnippet(slug, {
        borderRadius,
        minHeight,
        title,
        mode: effectiveMode,
        side: drawerSide,
        tabLabel: buttonLabel,
        buttonColor,
        width: drawerWidth,
        animation,
        logoUrl: logoUrl || undefined,
      }),
    [slug, borderRadius, minHeight, title, effectiveMode, drawerSide, buttonLabel, buttonColor, drawerWidth, animation, logoUrl]
  );

  const copy = async (type: "link" | "snippet", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(""), 1200);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [cfgRes, subRes, bizRes] = await Promise.all([
          fetch("/api/business/config"),
          fetch("/api/billing/subscription"),
          fetch("/api/business"),
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
          if (typeof widget.animation === "string" && widget.animation.trim()) setAnimation(widget.animation);
          if (typeof ui.showIcons === "boolean") setShowIcons(ui.showIcons);
          if (typeof ui.showLivePricing === "boolean") setShowLivePricing(ui.showLivePricing);
        }

        try {
          const bizJson = (await bizRes.json()) as { success?: boolean; data?: { logoUrl?: string | null } | null };
          if (bizRes.ok && bizJson?.data?.logoUrl) setLogoUrl(bizJson.data.logoUrl);
        } catch {
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
          animation,
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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tab label</label>
              <input
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tab color</label>
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
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Attention animation</label>
              <select
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                value={animation}
                onChange={(e) => setAnimation(e.target.value)}
              >
                <option value="none">None</option>
                <option value="wiggle">Wiggle-bounce (glow)</option>
                <option value="shake">Shake</option>
                <option value="bounce">Bounce</option>
                <option value="pulse">Pulse</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Panel header title</label>
              <input
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Book Your Service"
              />
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

      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-muted-foreground">Live preview</div>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPreviewDevice(d)}
                className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  previewDevice === d ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        {isDrawer && (
          <div className="text-xs text-muted-foreground">
            In drawer mode a vertical “{buttonLabel}” tab sits on the {drawerSide} edge of your site (vertically centered)
            and slides this panel out when clicked. Preview of the panel contents:
          </div>
        )}
        <div className={previewDevice === "mobile" ? "flex justify-center" : ""}>
          <div
            className="overflow-hidden border border-border bg-background"
            style={{
              width: previewDevice === "mobile" ? 390 : "100%",
              maxWidth: "100%",
              borderRadius:
                borderRadius === "sharp"
                  ? 4
                  : borderRadius === "pill"
                    ? 50
                    : 10,
            }}
          >
            <iframe
              key={previewDevice}
              title="Widget preview"
              src={previewUrl}
              style={{ width: "100%", border: 0, minHeight: `${Number(minHeight) || 920}px` }}
              allow="payment; clipboard-write"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
