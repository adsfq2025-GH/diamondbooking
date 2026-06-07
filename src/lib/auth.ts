// src/lib/auth.ts
// NextAuth v5 (Auth.js) configuration

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { z } from "zod";

const authUrlForCookies = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
let cookieDomain: string | undefined;
try {
  const host = authUrlForCookies ? new URL(authUrlForCookies).hostname : undefined;
  cookieDomain =
    host === "diamond-booking.com" || host === "www.diamond-booking.com"
      ? ".diamond-booking.com"
      : undefined;
} catch {
  cookieDomain = undefined;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  businessSlug: z.string().min(1).optional(),
});

export const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  providers: [
    ...(process.env.GOOGLE_OAUTH_ENABLED === "true" && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                role: Role.OWNER,
              };
            },
          }),
        ]
      : []),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        businessSlug: { label: "Business", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, businessSlug } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            role: true,
            isActive: true,
            emailVerified: true,
            portalBusinessId: true,
          },
        });

        if (!user || !user.password) return null;
        if (!user.isActive) throw new Error("Account disabled");
        if (!user.emailVerified && user.role !== Role.SUPER_ADMIN) {
          throw new Error("Please verify your email first");
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        if (user.role === Role.STAFF || user.role === Role.CUSTOMER) {
          if (!businessSlug) return null;
          if (!user.portalBusinessId) return null;
          const biz = await prisma.business.findUnique({
            where: { id: user.portalBusinessId },
            select: { slug: true },
          });
          if (!biz || biz.slug !== businessSlug) return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          portalBusinessId: user.portalBusinessId ?? undefined,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in — attach role and business info to token
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.email = user.email ?? undefined;

        const portalBusinessId = (user as { portalBusinessId?: string | null }).portalBusinessId ?? null;
        token.portalBusinessId = portalBusinessId ?? undefined;

        // Load business info for OWNER
        if (user.role === Role.OWNER) {
          const business = await prisma.business.findUnique({
            where: { ownerId: user.id },
            select: { id: true, slug: true },
          });
          if (business) {
            token.businessId = business.id;
            token.businessSlug = business.slug;
          }
        }
        if ((user.role === Role.STAFF || user.role === Role.CUSTOMER) && portalBusinessId) {
          const business = await prisma.business.findUnique({
            where: { id: portalBusinessId },
            select: { id: true, slug: true },
          });
          if (business) {
            token.businessId = business.id;
            token.businessSlug = business.slug;
          }
        }
        if (user.role === Role.STAFF && user.email && token.businessId) {
          const staff = await prisma.staff.findFirst({
            where: { email: user.email.toLowerCase(), businessId: token.businessId as string },
            select: { id: true, businessId: true, business: { select: { slug: true } } },
          });
          if (staff) {
            token.staffId = staff.id;
            token.businessId = staff.businessId;
            token.businessSlug = staff.business.slug;
          }
        }
        if (user.role === Role.CUSTOMER && user.email && token.businessId) {
          const customer = await prisma.customer.findFirst({
            where: { email: user.email.toLowerCase(), businessId: token.businessId as string },
            orderBy: { updatedAt: "desc" },
            select: { id: true, businessId: true, business: { select: { slug: true } } },
          });
          if (customer) {
            token.customerId = customer.id;
            token.businessId = customer.businessId;
            token.businessSlug = customer.business.slug;
          }
        }
      }

      if ((token.role === Role.STAFF || token.role === Role.CUSTOMER) && token.id && (!token.businessId || !token.businessSlug)) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { portalBusinessId: true },
        });
        if (u?.portalBusinessId) {
          token.portalBusinessId = u.portalBusinessId;
          const business = await prisma.business.findUnique({
            where: { id: u.portalBusinessId },
            select: { id: true, slug: true },
          });
          token.businessId = business?.id;
          token.businessSlug = business?.slug;
        }
      }

      if (token.role === Role.STAFF && token.email && token.businessId && !token.staffId) {
        const staff = await prisma.staff.findFirst({
          where: { email: token.email.toLowerCase(), businessId: token.businessId as string },
          select: { id: true, businessId: true, business: { select: { slug: true } } },
        });
        if (staff) {
          token.staffId = staff.id;
          token.businessId = staff.businessId;
          token.businessSlug = staff.business.slug;
        }
      }

      if (token.role === Role.CUSTOMER && token.email && token.businessId && !token.customerId) {
        const customer = await prisma.customer.findFirst({
          where: { email: token.email.toLowerCase(), businessId: token.businessId as string },
          orderBy: { updatedAt: "desc" },
          select: { id: true, businessId: true, business: { select: { slug: true } } },
        });
        if (customer) {
          token.customerId = customer.id;
          token.businessId = customer.businessId;
          token.businessSlug = customer.business.slug;
        }
      }

      // Session update (e.g. after onboarding creates the business)
      if (trigger === "update" && session) {
        if (token.role === Role.OWNER) {
          const business = await prisma.business.findUnique({
            where: { ownerId: token.id as string },
            select: { id: true, slug: true },
          });
          token.businessId = business?.id;
          token.businessSlug = business?.slug;
        }
        if (session.isImpersonating !== undefined) {
          token.isImpersonating = session.isImpersonating;
          token.originalAdminId = session.originalAdminId;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.businessId = token.businessId as string | undefined;
        session.user.businessSlug = token.businessSlug as string | undefined;
        session.user.staffId = token.staffId as string | undefined;
        session.user.customerId = token.customerId as string | undefined;
        session.user.portalBusinessId = token.portalBusinessId as string | undefined;
        session.user.isImpersonating = token.isImpersonating as boolean | undefined;
        session.user.originalAdminId = token.originalAdminId as string | undefined;
      }
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        try {
          const settings = await prisma.platformSettings.findUnique({
            where: { id: 1 },
            select: { defaultTrialDays: true },
          });
          const trialDays = settings?.defaultTrialDays ?? 14;
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + trialDays);

          await prisma.subscription.upsert({
            where: { userId: user.id },
            update: {},
            create: {
              userId: user.id,
              plan: "FREE",
              status: "TRIALING",
              trialStart: new Date(),
              trialEnd,
            },
          });

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        } catch {}
      }

      return true;
    },

    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (target.origin === base.origin) return url;

        const sameProdPair =
          base.protocol === "https:" &&
          target.protocol === "https:" &&
          ((base.hostname === "diamond-booking.com" && target.hostname === "www.diamond-booking.com") ||
            (base.hostname === "www.diamond-booking.com" && target.hostname === "diamond-booking.com"));
        if (sameProdPair) return url;
      } catch {
        // fall through
      }
      return baseUrl;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
    verifyRequest: "/verify-email",
  },

  ...(cookieDomain
    ? {
        cookies: {
          sessionToken: {
            name: "__Secure-authjs.session-token",
            options: {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: true,
              domain: cookieDomain,
            },
          },
          callbackUrl: {
            name: "__Secure-authjs.callback-url",
            options: {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: true,
              domain: cookieDomain,
            },
          },
          pkceCodeVerifier: {
            name: "__Secure-authjs.pkce.code_verifier",
            options: {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: true,
              domain: cookieDomain,
              maxAge: 60 * 15,
            },
          },
          state: {
            name: "__Secure-authjs.state",
            options: {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: true,
              domain: cookieDomain,
              maxAge: 60 * 15,
            },
          },
          nonce: {
            name: "__Secure-authjs.nonce",
            options: {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: true,
              domain: cookieDomain,
            },
          },
        },
      }
    : {}),

  events: {
    async createUser({ user }) {
      if (user.id) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              userEmail: user.email ?? undefined,
              action: "USER_REGISTERED",
              targetType: "User",
              targetId: user.id,
              targetName: user.email ?? undefined,
              metadata: { provider: "google" },
            },
          });
        } catch {}
      }
    },
  },

  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);

// ─── Helper: Get session on server ─────────────
export async function getSession() {
  return await auth();
}

// ─── Helper: Require auth + role ─────────────
export async function requireAuth(allowedRoles?: Role[]) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role as Role)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}

// ─── Helper: Require super admin ─────────────
export async function requireSuperAdmin() {
  return requireAuth([Role.SUPER_ADMIN]);
}

// ─── Helper: Require business owner ──────────
export async function requireOwner() {
  return requireAuth([Role.OWNER, Role.SUPER_ADMIN]);
}
