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

  // ── Drawer styles (CSS-only animations, injected once) ────────────────────
  function injectDrawerStyles() {
    if (document.getElementById("db-drawer-styles")) return;
    var css = [
      ".db-tabwrap{position:fixed;top:50%;z-index:" + (Z + 1) + ";transform:translateY(-50%);}",
      ".db-tab{display:inline-flex;align-items:center;justify-content:center;border:0;cursor:pointer;padding:18px 10px;font:700 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.08em;text-transform:uppercase;writing-mode:vertical-rl;text-orientation:mixed;box-shadow:0 6px 22px rgba(0,0,0,.24);will-change:transform,box-shadow;}",
      ".db-tab:focus-visible{outline:2px solid #fff;outline-offset:2px;}",
      "@keyframes dbWiggleR{0%,84%,100%{transform:translateX(0);}88%{transform:translateX(-9px);}91%{transform:translateX(-3px);}94%{transform:translateX(-7px);}}",
      "@keyframes dbWiggleL{0%,84%,100%{transform:translateX(0);}88%{transform:translateX(9px);}91%{transform:translateX(3px);}94%{transform:translateX(7px);}}",
      "@keyframes dbGlow{0%,84%,100%{box-shadow:0 6px 22px rgba(0,0,0,.24);}90%{box-shadow:0 0 24px 5px rgba(236,72,153,.8);}}",
      ".db-anim-wiggle-right{animation:dbWiggleR 4.5s ease-in-out infinite, dbGlow 4.5s ease-in-out infinite;}",
      ".db-anim-wiggle-left{animation:dbWiggleL 4.5s ease-in-out infinite, dbGlow 4.5s ease-in-out infinite;}",
      "@keyframes dbShake{0%,88%,100%{transform:translateX(0);}89.5%{transform:translateX(-3px);}91%{transform:translateX(3px);}92.5%{transform:translateX(-3px);}94%{transform:translateX(3px);}95.5%{transform:translateX(0);}}",
      ".db-anim-shake{animation:dbShake 3.5s ease-in-out infinite;}",
      "@keyframes dbBounceR{0%,80%,100%{transform:translateX(0);}86%{transform:translateX(-11px);}93%{transform:translateX(-4px);}}",
      "@keyframes dbBounceL{0%,80%,100%{transform:translateX(0);}86%{transform:translateX(11px);}93%{transform:translateX(4px);}}",
      ".db-anim-bounce-right{animation:dbBounceR 3s cubic-bezier(.28,.84,.42,1) infinite;}",
      ".db-anim-bounce-left{animation:dbBounceL 3s cubic-bezier(.28,.84,.42,1) infinite;}",
      "@keyframes dbPulseS{0%,100%{box-shadow:0 6px 22px rgba(0,0,0,.24);}50%{box-shadow:0 0 22px 5px rgba(236,72,153,.6);}}",
      ".db-anim-pulse{animation:dbPulseS 2.2s ease-in-out infinite;}",
      ".db-tab:hover{animation-play-state:paused !important;}",
      "@keyframes dbLogoPulse{0%,100%{transform:scale(1);opacity:.75;}50%{transform:scale(1.14);opacity:1;}}",
      ".db-loader{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fff;transition:opacity .35s ease;z-index:2;}",
      ".db-loader img{width:72px;height:72px;object-fit:contain;animation:dbLogoPulse 1.1s ease-in-out infinite;}",
      "@keyframes dbShimmer{0%{transform:translateX(-140%);}55%,100%{transform:translateX(160%);}}",
      ".db-shimmer{position:absolute;top:0;left:0;height:100%;width:55%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.6),transparent);animation:dbShimmer 3.4s ease-in-out infinite;pointer-events:none;z-index:0;}",
      "@keyframes dbTitleIn{from{opacity:0;transform:translateX(-16px);}to{opacity:1;transform:translateX(0);}}",
      ".db-title-in{animation:dbTitleIn .5s ease .05s both;}",
      "@media (prefers-reduced-motion: reduce){.db-anim-wiggle-right,.db-anim-wiggle-left,.db-anim-shake,.db-anim-bounce-right,.db-anim-bounce-left,.db-anim-pulse,.db-loader img,.db-shimmer,.db-title-in{animation:none !important;}}",
    ].join("");
    var style = document.createElement("style");
    style.id = "db-drawer-styles";
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function animClass(animation, side) {
    var a = String(animation || "").toLowerCase();
    if (a === "wiggle" || a === "wiggle-bounce") return side === "left" ? "db-anim-wiggle-left" : "db-anim-wiggle-right";
    if (a === "shake") return "db-anim-shake";
    if (a === "bounce") return side === "left" ? "db-anim-bounce-left" : "db-anim-bounce-right";
    if (a === "pulse") return "db-anim-pulse";
    return "";
  }

  // ── Drawer (slide-out) embed ─────────────────────────────────────────────
  function createDrawerEmbed(slug, opts) {
    var cleanSlug = normalizeSlug(slug);
    if (!cleanSlug) return false;
    if (!document.body) return false;
    if (window.__DiamondBookingDrawerMounted) return true;
    window.__DiamondBookingDrawerMounted = true;

    injectDrawerStyles();

    var side = (opts && String(opts.side).toLowerCase() === "left") ? "left" : "right";
    var widthNum = parsePxNumber(opts && opts.width, 420);
    var widthCss = "min(" + widthNum + "px, 96vw)";
    var label = (opts && (opts.tabLabel || opts.buttonLabel)) ? String(opts.tabLabel || opts.buttonLabel) : "Book Now";
    var tabColor = (opts && opts.buttonColor) ? String(opts.buttonColor) : "#0b5c8b";
    var tabText = (opts && opts.buttonTextColor) ? String(opts.buttonTextColor) : "#ffffff";
    var title = (opts && opts.title) ? String(opts.title) : "Book Your Service";
    var logoUrl = (opts && opts.logoUrl) ? String(opts.logoUrl) : (APP_ORIGIN + "/brand/logohead.webp");
    var hiddenTransform = side === "left" ? "translateX(-100%)" : "translateX(100%)";
    var tabRadius = side === "left" ? "0 12px 12px 0" : "12px 0 0 12px";

    // Vertical edge tab (positioning wrapper keeps translateY separate from anim)
    var tabWrap = document.createElement("div");
    tabWrap.className = "db-tabwrap";
    tabWrap.style[side] = "0";

    var tab = document.createElement("button");
    tab.type = "button";
    tab.className = "db-tab";
    var extraAnim = animClass(opts && opts.animation, side);
    if (extraAnim) tab.className += " " + extraAnim;
    tab.setAttribute("aria-label", label);
    tab.textContent = label;
    tab.style.background = tabColor;
    tab.style.color = tabText;
    tab.style.borderRadius = tabRadius;
    tabWrap.appendChild(tab);

    // Overlay
    var overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed", "inset:0", "background:rgba(0,0,0,.45)",
      "opacity:0", "pointer-events:none", "transition:opacity .3s ease",
      "z-index:" + (Z + 2),
    ].join(";");

    // Panel
    var panel = document.createElement("div");
    panel.style.cssText = [
      "position:fixed", "top:0", side + ":0", "height:100vh", "height:100dvh",
      "width:" + widthCss, "background:#ffffff", "box-shadow:0 0 40px rgba(0,0,0,.28)",
      "transform:" + hiddenTransform, "transition:transform .34s cubic-bezier(.4,0,.2,1)",
      "z-index:" + (Z + 3), "display:flex", "flex-direction:column", "overflow:hidden",
    ].join(";");

    // Header (shimmer sweep + slide-in title)
    var header = document.createElement("div");
    header.style.cssText = [
      "position:relative", "overflow:hidden", "flex:0 0 auto", "display:flex",
      "align-items:center", "justify-content:space-between", "gap:12px",
      "padding:14px 16px", "border-bottom:1px solid #eef1f4",
      "font:700 15px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif", "color:#0b5c8b",
    ].join(";");
    var shimmer = document.createElement("div");
    shimmer.className = "db-shimmer";
    var headTitle = document.createElement("div");
    headTitle.textContent = title;
    headTitle.style.cssText = "position:relative;z-index:1;";
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = [
      "position:relative", "z-index:1", "border:0", "background:transparent",
      "font-size:26px", "line-height:1", "color:#6b7280", "cursor:pointer", "padding:0 4px",
    ].join(";");
    header.appendChild(shimmer);
    header.appendChild(headTitle);
    header.appendChild(closeBtn);

    // Body: lazy iframe + pulsating logo loader
    var body = document.createElement("div");
    body.style.cssText = "flex:1 1 auto;position:relative;overflow:hidden;background:#fff";

    panel.appendChild(header);
    panel.appendChild(body);

    var iframe = null;
    function ensureIframe() {
      if (iframe) return;
      var loader = document.createElement("div");
      loader.className = "db-loader";
      var img = document.createElement("img");
      img.alt = "Loading";
      img.src = logoUrl;
      img.onerror = function () { img.src = APP_ORIGIN + "/brand/logohead.webp"; };
      loader.appendChild(img);
      body.appendChild(loader);

      iframe = makeIframe(cleanSlug, title);
      iframe.src = bookingSrc(cleanSlug);
      iframe.setAttribute("loading", "lazy");
      iframe.style.cssText = "position:relative;z-index:1;width:100%;height:100%;border:0;display:block;background:#fff";
      iframe.addEventListener("load", function () {
        loader.style.opacity = "0";
        setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 400);
      });
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
        tabWrap.style.display = "none";
        // restart the title slide-in each time it opens
        headTitle.classList.remove("db-title-in");
        void headTitle.offsetWidth;
        headTitle.classList.add("db-title-in");
        try { document.documentElement.style.overflow = "hidden"; } catch (e1) {}
      } else {
        panel.style.transform = hiddenTransform;
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
        tabWrap.style.display = "";
        try { document.documentElement.style.overflow = ""; } catch (e2) {}
      }
    }

    tab.addEventListener("click", function () { setOpen(true); });
    closeBtn.addEventListener("click", function () { setOpen(false); });
    overlay.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.keyCode === 27) && open) setOpen(false);
    });

    document.body.appendChild(tabWrap);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Public open/close handle
    window.DiamondBookingDrawer = { open: function () { setOpen(true); }, close: function () { setOpen(false); } };

    // Let ANY booking button on the host site open the drawer.
    if (!window.__DiamondBookingTriggersBound) {
      window.__DiamondBookingTriggersBound = true;
      document.addEventListener("click", function (e) {
        var t = e.target;
        while (t && t.nodeType === 1) {
          var cls = t.className && typeof t.className === "string" ? t.className : "";
          if (
            (t.hasAttribute && (t.hasAttribute("data-diamond-booking-open") || t.hasAttribute("data-db-open"))) ||
            cls.indexOf("diamond-booking-open") !== -1
          ) {
            e.preventDefault();
            if (window.DiamondBookingDrawer) window.DiamondBookingDrawer.open();
            return;
          }
          t = t.parentNode;
        }
      }, true);
    }

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
      tabLabel: script.getAttribute("data-tab-label") || undefined,
      buttonLabel: script.getAttribute("data-button-label") || undefined,
      buttonColor: script.getAttribute("data-button-color") || undefined,
      buttonTextColor: script.getAttribute("data-button-text-color") || undefined,
      animation: script.getAttribute("data-animation") || undefined,
      logoUrl: script.getAttribute("data-logo-url") || undefined,
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
