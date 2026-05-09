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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: Role.OWNER, // Google sign-ups are always OWNER
        };
      },
    }),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.password) return null;
        if (!user.isActive) throw new Error("Account disabled");
        if (!user.emailVerified && user.role !== Role.SUPER_ADMIN) {
          throw new Error("Please verify your email first");
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

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
        session.user.isImpersonating = token.isImpersonating as boolean | undefined;
        session.user.originalAdminId = token.originalAdminId as string | undefined;
      }
      return session;
    },

    async signIn({ user, account }) {
      // OAuth sign-in: create subscription if first time
      if (account?.provider === "google" && user.id) {
        const existingSubscription = await prisma.subscription.findUnique({
          where: { userId: user.id },
        });

        if (!existingSubscription) {
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 14);

          await prisma.subscription.create({
            data: {
              userId: user.id,
              plan: "FREE",
              status: "TRIALING",
              trialStart: new Date(),
              trialEnd,
            },
          });
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }

      return true;
    },

    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },

  events: {
    async createUser({ user }) {
      // New user via OAuth — create a 14-day trial subscription
      if (user.id) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);

        await prisma.subscription.create({
          data: {
            userId: user.id,
            plan: "FREE",
            status: "TRIALING",
            trialStart: new Date(),
            trialEnd,
          },
        });

        // Log to audit
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
