// src/middleware.ts
// Route protection, role-based redirects, maintenance mode

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Role = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "STAFF";

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
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const user = token ? { id: token.id as string, role: token.role as Role } : null;

  // ── Check public prefixes ─────────────────
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // ── Check public routes ───────────────────
  if (PUBLIC_ROUTES.includes(pathname)) {
    // If already logged in, redirect to appropriate dashboard
    if (user) {
      return redirectToDashboard(user, request);
    }
    return NextResponse.next();
  }

  // ── Unauthenticated → login ───────────────
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { role } = user;

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
      return NextResponse.redirect(new URL("/login", request.url));
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
  user: { role: Role },
  request: NextRequest
): NextResponse {
  if (user.role === "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/superadmin", request.url));
  }
  return NextResponse.redirect(new URL("/dashboard", request.url));
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
