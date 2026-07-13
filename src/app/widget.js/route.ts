function js(content: string) {
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // CDN + browser caching. Widget script content is safe to cache.
      "Cache-Control": "public, s-maxage=300, max-age=300, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function getWidgetOrigin() {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/+$/, "");
  return "https://www.diamond-booking.com";
}

export async function GET() {
  const origin = getWidgetOrigin();

  return js(`
(function () {
  "use strict";
  if (window.__DiamondBookingLoaded) return;
  window.__DiamondBookingLoaded = true;

  var APP_ORIGIN = ${JSON.stringify(origin)};
  var Z = 2147483000;

  function normalizeSlug(slug) {
    if (!slug) return "";
    return String(slug).trim().replace(/^\\/+/, "").replace(/\\/+$/, "");
  }

  function radiusToPx(v) {
    if (!v) return "16px";
    var key = String(v).trim();
    if (key === "sharp") return "4px";
    if (key === "soft") return "10px";
    if (key === "pill") return "50px";
    if (/^\\d+(px)?$/.test(key)) return key.endsWith("px") ? key : key + "px";
    return "16px";
  }

  function parsePxNumber(v, fallback) {
    if (v === null || v === undefined) return fallback;
    var s = String(v).trim();
    var m = s.match(/(\\d+)/);
    var n = m ? Number(m[1]) : NaN;
    if (isNaN(n) || n <= 0) return fallback;
    return n;
  }

  function bookingSrc(cleanSlug) {
    return APP_ORIGIN + "/book/" + encodeURIComponent(cleanSlug) + "?embed=1";
  }

  function makeIframe(cleanSlug, title) {
    var iframe = document.createElement("iframe");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.setAttribute("title", title || "Book an appointment");
    iframe.setAttribute("allow", "payment; clipboard-write");
    iframe.setAttribute("allowfullscreen", "");
    return iframe;
  }

  // ── Inline embed ─────────────────────────────────────────────────────────
  function createEmbed(slug, opts) {
    var rootId = (opts && opts.rootId) ? String(opts.rootId) : "diamond-booking-widget";
    var root = (opts && opts.root) ? opts.root : document.getElementById(rootId);
    if (!root && document.body) {
      root = document.createElement("div");
      root.id = rootId;
      document.body.appendChild(root);
    }
    if (!root) return false;

    var cleanSlug = normalizeSlug(slug);
    if (!cleanSlug) return false;

    var radius = (opts && opts.borderRadius) ? radiusToPx(opts.borderRadius) : "16px";
    var minHeightStr = (opts && opts.minHeight) ? String(opts.minHeight).trim() : "920px";
    var minHeightNum = parsePxNumber(minHeightStr, 920);
    var title = (opts && opts.title) ? String(opts.title) : "Book an appointment";

    // Avoid double-embedding
    if (root.getAttribute("data-db-embedded") === cleanSlug) {
      var existing = root.querySelector("iframe");
      if (existing) {
        existing.style.borderRadius = radius;
        existing.style.minHeight = minHeightStr;
        existing.setAttribute("data-db-min-height", String(minHeightNum));
        existing.setAttribute("title", title);
      }
      return true;
    }
    root.setAttribute("data-db-embedded", cleanSlug);

    var oldIframe = root.querySelector("iframe");
    if (oldIframe && oldIframe.__dbOnMessage) {
      window.removeEventListener("message", oldIframe.__dbOnMessage);
    }

    var iframe = makeIframe(cleanSlug, title);
    iframe.src = bookingSrc(cleanSlug);
    iframe.style.cssText = [
      "width:100%",
      "border:0",
      "border-radius:" + radius,
      "min-height:" + minHeightStr,
      "display:block",
      "overflow:hidden",
      "background:transparent",
    ].join(";");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("data-db-min-height", String(minHeightNum));

    // Auto-resize via postMessage
    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      if (e.origin !== APP_ORIGIN) return;
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "db:resize") {
        var h = Number(e.data.height);
        if (!isNaN(h) && h > 0) {
          var minH = Number(iframe.getAttribute("data-db-min-height") || 920);
          if (isNaN(minH) || minH <= 0) minH = 920;
          iframe.style.minHeight = Math.max(h, minH) + "px";
        }
        return;
      }
      dispatchWidgetEvent(e.data);
    }
    iframe.__dbOnMessage = onMessage;
    window.addEventListener("message", onMessage);

    root.innerHTML = "";
    root.appendChild(iframe);
    return true;
  }

  // ── Drawer (slide-out) embed ─────────────────────────────────────────────
  function createDrawerEmbed(slug, opts) {
    var cleanSlug = normalizeSlug(slug);
    if (!cleanSlug) return false;
    if (!document.body) return false;
    if (window.__DiamondBookingDrawerMounted) return true;
    window.__DiamondBookingDrawerMounted = true;

    var side = (opts && String(opts.side).toLowerCase() === "left") ? "left" : "right";
    var width = parsePxNumber(opts && opts.width, 420);
    var label = (opts && opts.buttonLabel) ? String(opts.buttonLabel) : "Book Now";
    var btnColor = (opts && opts.buttonColor) ? String(opts.buttonColor) : "#1a1f36";
    var btnText = (opts && opts.buttonTextColor) ? String(opts.buttonTextColor) : "#ffffff";
    var title = (opts && opts.title) ? String(opts.title) : "Book an appointment";

    var hiddenTransform = side === "left" ? "translateX(-100%)" : "translateX(100%)";

    // Launcher button
    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.setAttribute("aria-label", label);
    launcher.textContent = label;
    launcher.style.cssText = [
      "position:fixed",
      "bottom:20px",
      side + ":20px",
      "z-index:" + (Z + 1),
      "background:" + btnColor,
      "color:" + btnText,
      "border:0",
      "border-radius:9999px",
      "padding:14px 22px",
      "font:600 15px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
      "box-shadow:0 8px 24px rgba(0,0,0,.24)",
      "cursor:pointer",
    ].join(";");

    // Overlay
    var overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "background:rgba(0,0,0,.45)",
      "opacity:0",
      "pointer-events:none",
      "transition:opacity .3s ease",
      "z-index:" + (Z + 2),
    ].join(";");

    // Panel
    var panel = document.createElement("div");
    panel.style.cssText = [
      "position:fixed",
      "top:0",
      side + ":0",
      "height:100vh",
      "height:100dvh",
      "width:" + width + "px",
      "max-width:100vw",
      "background:#ffffff",
      "box-shadow:0 0 40px rgba(0,0,0,.28)",
      "transform:" + hiddenTransform,
      "transition:transform .32s cubic-bezier(.4,0,.2,1)",
      "z-index:" + (Z + 3),
      "display:flex",
      "flex-direction:column",
      "overflow:hidden",
    ].join(";");

    // Header
    var header = document.createElement("div");
    header.style.cssText = [
      "flex:0 0 auto",
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "gap:12px",
      "padding:12px 16px",
      "border-bottom:1px solid #eee",
      "font:600 15px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
      "color:#1a1f36",
    ].join(";");
    var headTitle = document.createElement("div");
    headTitle.textContent = title;
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = [
      "border:0",
      "background:transparent",
      "font-size:26px",
      "line-height:1",
      "color:#6b7280",
      "cursor:pointer",
      "padding:0 4px",
    ].join(";");
    header.appendChild(headTitle);
    header.appendChild(closeBtn);

    // Body holds the iframe (created lazily on first open)
    var body = document.createElement("div");
    body.style.cssText = "flex:1 1 auto;position:relative;overflow:hidden;background:#fff";

    panel.appendChild(header);
    panel.appendChild(body);

    var iframe = null;
    function ensureIframe() {
      if (iframe) return;
      iframe = makeIframe(cleanSlug, title);
      iframe.src = bookingSrc(cleanSlug);
      iframe.setAttribute("loading", "lazy");
      iframe.style.cssText = "width:100%;height:100%;border:0;display:block;background:#fff";
      function onMessage(e) {
        if (e.source !== iframe.contentWindow) return;
        if (e.origin !== APP_ORIGIN) return;
        if (!e.data || typeof e.data !== "object") return;
        if (e.data.type === "db:resize") return; // panel is fixed-height; iframe scrolls
        dispatchWidgetEvent(e.data);
      }
      window.addEventListener("message", onMessage);
      body.appendChild(iframe);
    }

    var open = false;
    function setOpen(next) {
      open = next;
      if (open) {
        ensureIframe();
        panel.style.transform = "translateX(0)";
        overlay.style.opacity = "1";
        overlay.style.pointerEvents = "auto";
        launcher.style.display = "none";
        try { document.documentElement.style.overflow = "hidden"; } catch (e1) {}
      } else {
        panel.style.transform = hiddenTransform;
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
        launcher.style.display = "";
        try { document.documentElement.style.overflow = ""; } catch (e2) {}
      }
    }

    launcher.addEventListener("click", function () { setOpen(true); });
    closeBtn.addEventListener("click", function () { setOpen(false); });
    overlay.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) setOpen(false);
    });

    document.body.appendChild(launcher);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Public open/close handle
    window.DiamondBookingDrawer = { open: function () { setOpen(true); }, close: function () { setOpen(false); } };
    return true;
  }

  function dispatchWidgetEvent(data) {
    var map = {
      "db:booking-complete": "diamondbooking:booking-complete",
      "db:payment-complete": "diamondbooking:payment-complete",
      "db:lead-created": "diamondbooking:lead-created",
      "db:appointment-confirmed": "diamondbooking:appointment-confirmed",
    };
    var name = map[data && data.type];
    if (!name) return;
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: data }));
    } catch (err) {}
  }

  function mount(slug, config) {
    if (config && String(config.mode).toLowerCase() === "drawer") {
      return createDrawerEmbed(slug, config);
    }
    return createEmbed(slug, config);
  }

  window.DiamondBookingWidget = function (config) {
    if (!config || !config.slug) return;
    mount(config.slug, config);
  };

  function findAutoConfig() {
    var script = document.getElementById("db-widget");
    if (!script) {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var s = scripts[i];
        var src = s && s.getAttribute ? s.getAttribute("src") : "";
        if (!src) continue;
        if (src.indexOf("/widget.js") !== -1 && s.getAttribute("data-business")) {
          script = s;
          break;
        }
      }
    }
    if (!script || !script.getAttribute) return null;
    var slug = script.getAttribute("data-business") || script.getAttribute("data-slug");
    if (!slug) return null;
    return {
      slug: slug,
      rootId: script.getAttribute("data-root-id") || script.getAttribute("data-root") || "diamond-booking-widget",
      borderRadius: script.getAttribute("data-radius") || undefined,
      title: script.getAttribute("data-title") || undefined,
      minHeight: script.getAttribute("data-min-height") || undefined,
      mode: script.getAttribute("data-mode") || undefined,
      side: script.getAttribute("data-side") || undefined,
      buttonLabel: script.getAttribute("data-button-label") || undefined,
      buttonColor: script.getAttribute("data-button-color") || undefined,
      buttonTextColor: script.getAttribute("data-button-text-color") || undefined,
      width: script.getAttribute("data-width") || undefined,
    };
  }

  function boot(attempt) {
    var auto = findAutoConfig();
    if (auto && auto.slug) {
      if (mount(auto.slug, auto)) return;
    }
    if (attempt >= 100) {
      // MutationObserver fallback for SPA frameworks that replace the DOM
      if (typeof MutationObserver !== "undefined" && document.documentElement) {
        var observer = new MutationObserver(function () {
          var cfg = findAutoConfig();
          if (cfg && cfg.slug && mount(cfg.slug, cfg)) {
            observer.disconnect();
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      }
      return;
    }
    setTimeout(function () { boot(attempt + 1); }, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { boot(0); });
  } else {
    boot(0);
  }
})();
`);
}
