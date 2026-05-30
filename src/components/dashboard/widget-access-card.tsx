"use client";

import { useMemo, useState } from "react";
import { buildWidgetEmbedSnippet, getPublicAppUrl } from "@/lib/widget-embed";

export function WidgetAccessCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState<"link" | "snippet" | "">("");

  const appUrl = useMemo(() => getPublicAppUrl(), []);

  const bookingUrl = `${appUrl}/book/${slug}`;
  const snippet = buildWidgetEmbedSnippet(slug);

  const copy = async (type: "link" | "snippet", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(""), 1200);
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
    </div>
  );
}

