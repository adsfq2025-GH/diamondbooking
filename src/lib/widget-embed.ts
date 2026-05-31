function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

/**
 * Public-facing origin used for booking links + widget script URLs.
 *
 * Important:
 * - In production, set NEXT_PUBLIC_APP_URL to the canonical https origin.
 * - In development, falls back to localhost.
 */
export function getPublicAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return normalizeOrigin(envUrl);
  if (typeof window !== "undefined" && window.location?.origin) return normalizeOrigin(window.location.origin);
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  // Production fallback — set NEXT_PUBLIC_APP_URL to avoid this
  console.warn("[widget-embed] NEXT_PUBLIC_APP_URL is not set. Widget snippets will use fallback URL.");
  return "https://www.diamond-booking.com";
}

export function buildBookingUrl(slug: string) {
  const appUrl = getPublicAppUrl();
  return `${appUrl}/book/${slug}`;
}

export function buildWidgetEmbedSnippet(
  slug: string,
  opts?: { rootId?: string; borderRadius?: string; minHeight?: string | number; title?: string }
) {
  const appUrl = getPublicAppUrl();
  const rootId = opts?.rootId?.trim() || "diamond-booking-widget";
  const radius = opts?.borderRadius?.trim();
  const title = opts?.title?.trim();
  const minHeight =
    typeof opts?.minHeight === "number"
      ? String(opts.minHeight)
      : typeof opts?.minHeight === "string"
        ? opts.minHeight.trim()
        : "";

  const attrs = [
    `async`,
    `id="db-widget"`,
    `src="${appUrl}/widget.js"`,
    `data-business="${slug}"`,
    `data-root-id="${rootId}"`,
    radius ? `data-radius="${radius}"` : "",
    minHeight ? `data-min-height="${minHeight}"` : "",
    title ? `data-title="${title}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<div id="${rootId}"></div>
<script ${attrs}></script>`;
}
