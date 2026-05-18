import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function js(content: string) {
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  return js(`
(function () {
  if (window.DiamondBookingWidget) return;

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

  function createEmbed(slug, opts) {
    var root = (opts && opts.root) ? opts.root : null;
    if (!root) root = document.getElementById("diamond-booking-widget");
    if (!root) return;

    var cleanSlug = normalizeSlug(slug);
    if (!cleanSlug) return;

    var iframe = document.createElement("iframe");
    iframe.src = "${origin}/book/" + encodeURIComponent(cleanSlug) + "?embed=1";
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.borderRadius = (opts && opts.borderRadius) ? radiusToPx(opts.borderRadius) : "16px";
    iframe.style.minHeight = (opts && opts.minHeight) ? String(opts.minHeight) : "720px";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.setAttribute("title", (opts && opts.title) ? String(opts.title) : "Booking");

    root.innerHTML = "";
    root.appendChild(iframe);
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

    var slug = script.getAttribute("data-business");
    if (!slug) return null;

    return {
      slug: slug,
      borderRadius: script.getAttribute("data-radius") || undefined,
      title: script.getAttribute("data-title") || undefined,
      minHeight: script.getAttribute("data-min-height") || undefined,
    };
  }

  var auto = findAutoConfig();
  if (auto && auto.slug) {
    window.DiamondBookingWidget(auto);
  }
})();
`);
}

