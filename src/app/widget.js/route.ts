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

    var iframe = document.createElement("iframe");
    iframe.src = APP_ORIGIN + "/book/" + encodeURIComponent(cleanSlug) + "?embed=1";
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
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.setAttribute("title", title);
    iframe.setAttribute("allow", "payment; clipboard-write");
    iframe.setAttribute("allowfullscreen", "");
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
      if (e.data.type === "db:booking-complete") {
        try {
          var evt = new CustomEvent("diamondbooking:booking-complete", { detail: e.data });
          window.dispatchEvent(evt);
        } catch (err) {}
        return;
      }
      if (e.data.type === "db:payment-complete") {
        try {
          var evt2 = new CustomEvent("diamondbooking:payment-complete", { detail: e.data });
          window.dispatchEvent(evt2);
        } catch (err2) {}
        return;
      }
      if (e.data.type === "db:lead-created") {
        try {
          var evt3 = new CustomEvent("diamondbooking:lead-created", { detail: e.data });
          window.dispatchEvent(evt3);
        } catch (err3) {}
        return;
      }
      if (e.data.type === "db:appointment-confirmed") {
        try {
          var evt4 = new CustomEvent("diamondbooking:appointment-confirmed", { detail: e.data });
          window.dispatchEvent(evt4);
        } catch (err4) {}
        return;
      }
    }
    iframe.__dbOnMessage = onMessage;
    window.addEventListener("message", onMessage);

    root.innerHTML = "";
    root.appendChild(iframe);
    return true;
  }

  window.DiamondBookingWidget = function (config) {
    if (!config || !config.slug) return;
    createEmbed(config.slug, config);
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
    };
  }

  function boot(attempt) {
    var auto = findAutoConfig();
    if (auto && auto.slug) {
      if (createEmbed(auto.slug, auto)) return;
    }
    if (attempt >= 100) {
      // MutationObserver fallback for SPA frameworks that replace the DOM
      if (typeof MutationObserver !== "undefined" && document.documentElement) {
        var observer = new MutationObserver(function () {
          var cfg = findAutoConfig();
          if (cfg && cfg.slug && createEmbed(cfg.slug, cfg)) {
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
