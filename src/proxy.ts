// src/middleware.ts
// Route protection, role-based redirects, maintenance mode

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Role = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "STAFF" | "CUSTOMER";

function parseTenantPath(pathname: string) {
  if (!pathname.startsWith("/b/")) return null;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  if (parts[0] !== "b") return null;
  const slug = parts[1];
  const area = parts[2];
  if (area !== "staff" && area !== "portal") return null;
  const tail = `/${parts.slice(3).join("/")}`;
  return {
    slug,
    area: area as "staff" | "portal",
    tail: tail === "/" ? "/" : tail,
    basePath: `/b/${slug}/${area}`,
  };
}

// Routes that never need protection
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/reset-password",
  "/verify-email",
  "/staff/login",
  "/portal/login",
  "/portal/register",
  "/pricing",
  "/features",
  "/faq",
  "/terms",
  "/privacy",
  "/contact",
];

// Routes accessible without auth (prefix match)
const PUBLIC_PREFIXES = [
  "/book/",       // public booking pages
  "/api/public/", // public API
  "/api/auth/",   // auth endpoints
  "/api/billing/webhook", // Stripe webhooks
  "/_next/",
  "/favicon",
  "/images/",
];

export default async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const { pathname } = url;
  const host = url.hostname;
  const tenant = parseTenantPath(pathname);

  if (pathname === "/post-login") {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV === "production" && host === "diamond-booking.com") {
    url.hostname = "www.diamond-booking.com";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  // ── Check public prefixes ─────────────────
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const isTenantPublic =
    !!tenant &&
    ((tenant.area === "staff" && tenant.tail === "/login") ||
      (tenant.area === "portal" && (tenant.tail === "/login" || tenant.tail === "/register")));

  if (isTenantPublic) {
    return NextResponse.next();
  }

  // ── Check public routes ───────────────────
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  let user: { id: string; role: Role; businessSlug?: string } | null = null;
  if (secret) {
    try {
      const token =
        (await getToken({ req: request, secret })) ??
        (await getToken({ req: request, secret, cookieName: "__Secure-authjs.session-token" })) ??
        (await getToken({ req: request, secret, cookieName: "authjs.session-token" }));
      user = token
        ? {
            id: token.id as string,
            role: token.role as Role,
            businessSlug: token.businessSlug as string | undefined,
          }
        : null;
    } catch {
      user = null;
    }
  }

  // ── Unauthenticated → login ───────────────
  if (!user) {
    if (tenant) {
      const loginUrl = new URL(`${tenant.basePath}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${url.search}`);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname.startsWith("/staff")) {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
    if (pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${url.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const { role } = user;

  if (tenant) {
    if (role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/superadmin", request.url));

    if (tenant.area === "staff") {
      if (role !== "STAFF") return redirectToDashboard(user, request);
    }
    if (tenant.area === "portal") {
      if (role !== "CUSTOMER") return redirectToDashboard(user, request);
    }

    if (user.businessSlug && user.businessSlug !== tenant.slug) {
      const correct =
        role === "STAFF"
          ? `/b/${user.businessSlug}/staff`
          : role === "CUSTOMER"
            ? `/b/${user.businessSlug}/portal`
            : "/dashboard";
      return NextResponse.redirect(new URL(correct, request.url));
    }

    return NextResponse.next();
  }

  // ── Super Admin routes ────────────────────
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/api/superadmin")) {
    if (role !== "SUPER_ADMIN") {
      return new NextResponse(
        JSON.stringify({ success: false, error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    return NextResponse.next();
  }

  // ── Business dashboard routes ─────────────
  if (pathname.startsWith("/dashboard")) {
    if (role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/superadmin", request.url));
    }
    if (role !== "OWNER" && role !== "ADMIN") {
      return redirectToDashboard(user, request);
    }
    return NextResponse.next();
  }

  // ── Staff routes ──────────────────────────
  if (pathname.startsWith("/staff")) {
    if (role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/superadmin", request.url));
    if (role !== "STAFF") return redirectToDashboard(user, request);
    if (user.businessSlug) {
      const rest = pathname.slice("/staff".length) || "";
      return NextResponse.redirect(new URL(`/b/${user.businessSlug}/staff${rest}`, request.url));
    }
    return NextResponse.next();
  }

  // ── Customer portal routes ────────────────
  if (pathname.startsWith("/portal")) {
    if (role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/superadmin", request.url));
    if (role !== "CUSTOMER") return redirectToDashboard(user, request);
    if (user.businessSlug) {
      const rest = pathname.slice("/portal".length) || "";
      return NextResponse.redirect(new URL(`/b/${user.businessSlug}/portal${rest}`, request.url));
    }
    return NextResponse.next();
  }

  // ── API routes — ensure ownership ─────────
  if (pathname.startsWith("/api/")) {
    return NextResponse.next(); // Route handlers do their own auth checks
  }

  // ── Onboarding ────────────────────────────
  if (pathname.startsWith("/onboarding")) {
    if (role !== "OWNER") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

function redirectToDashboard(
  user: { role: Role; businessSlug?: string },
  request: NextRequest
): NextResponse {
  if (user.role === "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/superadmin", request.url));
  }
  if (user.role === "STAFF") {
    return NextResponse.redirect(new URL(user.businessSlug ? `/b/${user.businessSlug}/staff` : "/staff", request.url));
  }
  if (user.role === "CUSTOMER") {
    return NextResponse.redirect(new URL(user.businessSlug ? `/b/${user.businessSlug}/portal` : "/portal", request.url));
  }
  return NextResponse.redirect(new URL("/dashboard", request.url));
}

// middleware.ts
export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - auth/login (the login page itself)
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - brand (your custom static folder containing the favicon)
   * - favicon.ico (standard favicon)
   */
  matcher: ['/((?!auth/login|api|_next/static|_next/image|brand|favicon.ico).*)'],
};
