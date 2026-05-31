"use client";

import { useEffect, useMemo, useState } from "react";
import { buildBookingUrl, buildWidgetEmbedSnippet } from "@/lib/widget-embed";

export function WidgetAccessCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState<"link" | "snippet" | "">("");
  const [borderRadius, setBorderRadius] = useState("soft");
  const [minHeight, setMinHeight] = useState("920");
  const [title, setTitle] = useState("Book an appointment");
  const [showIcons, setShowIcons] = useState(true);
  const [showLivePricing, setShowLivePricing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const bookingUrl = useMemo(() => buildBookingUrl(slug), [slug]);
  const snippet = useMemo(
    () =>
      buildWidgetEmbedSnippet(slug, {
        borderRadius,
        minHeight,
        title,
      }),
    [slug, borderRadius, minHeight, title]
  );

  const copy = async (type: "link" | "snippet", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(""), 1200);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/business/config");
        const json = (await res.json()) as { success: boolean; data?: { config?: unknown } };
        if (!res.ok || !json?.success) return;
        const cfg = (json.data?.config ?? {}) as Record<string, unknown>;
        const widget = (cfg.widget ?? {}) as Record<string, unknown>;
        const ui = (cfg.ui ?? {}) as Record<string, unknown>;

        const nextRadius = typeof widget.borderRadius === "string" ? widget.borderRadius : undefined;
        const nextMinHeight = typeof widget.minHeight === "string" ? widget.minHeight : undefined;
        const nextTitle = typeof widget.title === "string" ? widget.title : undefined;

        if (nextRadius) setBorderRadius(nextRadius);
        if (nextMinHeight) setMinHeight(nextMinHeight);
        if (nextTitle) setTitle(nextTitle);
        if (typeof ui.showIcons === "boolean") setShowIcons(ui.showIcons);
        if (typeof ui.showLivePricing === "boolean") setShowLivePricing(ui.showLivePricing);
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
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              value={minHeight}
              onChange={(e) => setMinHeight(e.target.value)}
              inputMode="numeric"
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
          <div className="text-xs font-medium text-muted-foreground">Embed code</div>
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
            src={`${bookingUrl}?embed=1`}
            style={{ width: "100%", border: 0, minHeight: `${Number(minHeight) || 920}px` }}
            allow="payment; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
}

