export function getPublicAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "https://www.diamond-booking.com";
}

export function buildWidgetEmbedSnippet(slug: string, opts?: { rootId?: string }) {
  const appUrl = getPublicAppUrl();
  const rootId = opts?.rootId?.trim() || "diamond-booking-widget";
  return `<div id="${rootId}"></div>
<script async id="db-widget" src="${appUrl}/widget.js" data-business="${slug}" data-root-id="${rootId}"></script>`;
}

