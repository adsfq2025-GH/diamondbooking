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

export type WidgetEmbedMode = "inline" | "drawer";

export function buildWidgetEmbedSnippet(
  slug: string,
  opts?: {
    rootId?: string;
    borderRadius?: string;
    minHeight?: string | number;
    title?: string;
    mode?: WidgetEmbedMode;
    side?: "left" | "right";
    buttonLabel?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    width?: string | number;
    tabLabel?: string;
    animation?: string;
    logoUrl?: string;
  }
) {
  const appUrl = getPublicAppUrl();
  const rootId = opts?.rootId?.trim() || "diamond-booking-widget";
  const radius = opts?.borderRadius?.trim();
  const title = opts?.title?.trim();
  const mode: WidgetEmbedMode = opts?.mode === "drawer" ? "drawer" : "inline";
  const minHeight =
    typeof opts?.minHeight === "number"
      ? String(opts.minHeight)
      : typeof opts?.minHeight === "string"
        ? opts.minHeight.trim()
        : "";
  const width =
    typeof opts?.width === "number"
      ? String(opts.width)
      : typeof opts?.width === "string"
        ? opts.width.trim()
        : "";

  if (mode === "drawer") {
    const side = opts?.side === "left" ? "left" : "right";
    const tabLabel = (opts?.tabLabel ?? opts?.buttonLabel)?.trim() || "Book Now";
    const buttonColor = opts?.buttonColor?.trim();
    const buttonTextColor = opts?.buttonTextColor?.trim();
    const animation = opts?.animation?.trim();
    const logoUrl = opts?.logoUrl?.trim();
    const attrs = [
      `async`,
      `id="db-widget"`,
      `src="${appUrl}/widget.js"`,
      `data-business="${slug}"`,
      `data-mode="drawer"`,
      `data-side="${side}"`,
      `data-tab-label="${tabLabel}"`,
      buttonColor ? `data-button-color="${buttonColor}"` : "",
      buttonTextColor ? `data-button-text-color="${buttonTextColor}"` : "",
      animation && animation !== "none" ? `data-animation="${animation}"` : "",
      logoUrl ? `data-logo-url="${logoUrl}"` : "",
      width ? `data-width="${width}"` : "",
      title ? `data-title="${title}"` : "",
    ]
      .filter(Boolean)
      .join(" ");
    // Drawer mounts itself onto <body>; no container div needed.
    return `<script ${attrs}></script>`;
  }

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
