// src/types/next-auth.d.ts
// Augment NextAuth types with our custom fields

import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: Role;
    businessId?: string;
    businessSlug?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: Role;
      businessId?: string;
      businessSlug?: string;
      isImpersonating?: boolean;
      originalAdminId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    businessId?: string;
    businessSlug?: string;
    isImpersonating?: boolean;
    originalAdminId?: string;
  }
}
