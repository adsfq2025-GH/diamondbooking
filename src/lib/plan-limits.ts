// src/lib/plan-limits.ts
// Enforce subscription plan limits for business owners

import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@prisma/client";

// Hardcoded limits as a fallback (DB is source of truth)
const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxStaff: number;
  maxServices: number;
  maxBookingsPerMonth: number;
  removesBranding: boolean;
  emailReminders: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}> = {
  FREE: {
    maxStaff: 1,
    maxServices: 3,
    maxBookingsPerMonth: 20,
    removesBranding: false,
    emailReminders: false,
    customDomain: false,
    apiAccess: false,
    prioritySupport: false,
  },
  STARTER: {
    maxStaff: 3,
    maxServices: 10,
    maxBookingsPerMonth: 100,
    removesBranding: true,
    emailReminders: false,
    customDomain: false,
    apiAccess: false,
    prioritySupport: false,
  },
  PROFESSIONAL: {
    maxStaff: 10,
    maxServices: -1,
    maxBookingsPerMonth: -1,
    removesBranding: true,
    emailReminders: true,
    customDomain: false,
    apiAccess: false,
    prioritySupport: true,
  },
  ENTERPRISE: {
    maxStaff: -1,
    maxServices: -1,
    maxBookingsPerMonth: -1,
    removesBranding: true,
    emailReminders: true,
    customDomain: true,
    apiAccess: true,
    prioritySupport: true,
  },
};

const FEATURE_KEYS = ["removesBranding", "emailReminders", "customDomain", "apiAccess", "prioritySupport"] as const;
type FeatureKey = (typeof FEATURE_KEYS)[number];

function isAfterNow(d: Date) {
  return d.getTime() > Date.now();
}

function parseDateMaybe(v: unknown) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isCompActive(sub: { isComped: boolean; compExpiresAt: Date | null }) {
  if (!sub.isComped) return false;
  if (!sub.compExpiresAt) return true;
  return isAfterNow(sub.compExpiresAt);
}

function applyFeatureOverrides<T extends Record<FeatureKey, boolean>>(
  base: T,
  overrides: unknown
): T {
  if (!overrides || typeof overrides !== "object") return base;
  const next = { ...base };

  for (const k of FEATURE_KEYS) {
    const raw = (overrides as any)[k];
    if (!raw || typeof raw !== "object") continue;
    const enabled = typeof raw.enabled === "boolean" ? raw.enabled : null;
    if (enabled === null) continue;
    const expiresAt = parseDateMaybe(raw.expiresAt);
    if (expiresAt && !isAfterNow(expiresAt)) continue;
    next[k] = enabled;
  }

  return next;
}

/**
 * Get plan limits from DB (falls back to hardcoded).
 */
export async function getPlanLimits(plan: SubscriptionPlan) {
  const config = await prisma.planConfig.findUnique({ where: { plan } });
  return config ?? PLAN_LIMITS[plan];
}

/**
 * Check if a business can add more staff.
 */
export async function canAddStaff(businessId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
}> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      owner: { include: { subscription: true } },
      _count: { select: { staff: { where: { isActive: true } } } },
    },
  });

  if (!business) throw new Error("Business not found");

  const plan = (business.owner.subscription?.plan ?? "FREE") as SubscriptionPlan;
  const limits = await getPlanLimits(plan);
  const current = business._count.staff;

  if (limits.maxStaff === -1) {
    return { allowed: true, current, limit: -1 };
  }

  if (current >= limits.maxStaff) {
    return {
      allowed: false,
      current,
      limit: limits.maxStaff,
      message: `Your ${plan} plan allows up to ${limits.maxStaff} staff member${limits.maxStaff === 1 ? "" : "s"}. Upgrade to add more.`,
    };
  }

  return { allowed: true, current, limit: limits.maxStaff };
}

/**
 * Check if a business can add more services.
 */
export async function canAddService(businessId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
}> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      owner: { include: { subscription: true } },
      _count: { select: { services: { where: { isActive: true } } } },
    },
  });

  if (!business) throw new Error("Business not found");

  const plan = (business.owner.subscription?.plan ?? "FREE") as SubscriptionPlan;
  const limits = await getPlanLimits(plan);
  const current = business._count.services;

  if (limits.maxServices === -1) {
    return { allowed: true, current, limit: -1 };
  }

  if (current >= limits.maxServices) {
    return {
      allowed: false,
      current,
      limit: limits.maxServices,
      message: `Your ${plan} plan allows up to ${limits.maxServices} services. Upgrade to add more.`,
    };
  }

  return { allowed: true, current, limit: limits.maxServices };
}

/**
 * Check if a business can accept more bookings this month.
 */
export async function canAcceptBooking(businessId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
}> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { owner: { include: { subscription: true } } },
  });

  if (!business) throw new Error("Business not found");

  const plan = (business.owner.subscription?.plan ?? "FREE") as SubscriptionPlan;
  const limits = await getPlanLimits(plan);

  if (limits.maxBookingsPerMonth === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Count bookings this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const current = await prisma.booking.count({
    where: {
      businessId,
      createdAt: { gte: startOfMonth },
      status: { notIn: ["CANCELLED"] },
    },
  });

  if (current >= limits.maxBookingsPerMonth) {
    return {
      allowed: false,
      current,
      limit: limits.maxBookingsPerMonth,
      message: `You've reached your ${limits.maxBookingsPerMonth} bookings/month limit on the ${plan} plan. Upgrade to accept more.`,
    };
  }

  return { allowed: true, current, limit: limits.maxBookingsPerMonth };
}

/**
 * Check if a business's subscription is active (not cancelled/past-due).
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) return false;

  if (isCompActive({ isComped: subscription.isComped, compExpiresAt: subscription.compExpiresAt })) return true;
  return ["ACTIVE", "TRIALING"].includes(subscription.status);
}

/**
 * Get current usage stats for a business (for the billing page).
 */
export async function getUsageStats(businessId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [staffCount, serviceCount, bookingCount, business] = await Promise.all([
    prisma.staff.count({ where: { businessId, isActive: true } }),
    prisma.service.count({ where: { businessId, isActive: true } }),
    prisma.booking.count({
      where: {
        businessId,
        createdAt: { gte: startOfMonth },
        status: { notIn: ["CANCELLED"] },
      },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      include: { owner: { include: { subscription: true } } },
    }),
  ]);

  const plan = (business?.owner.subscription?.plan ?? "FREE") as SubscriptionPlan;
  const limits = await getPlanLimits(plan);
  const sub = business?.owner.subscription;
  const comped = sub ? isCompActive({ isComped: sub.isComped, compExpiresAt: sub.compExpiresAt }) : false;
  const effectiveFeatures = applyFeatureOverrides(
    {
      removesBranding: !!limits.removesBranding,
      emailReminders: !!limits.emailReminders,
      customDomain: !!limits.customDomain,
      apiAccess: !!limits.apiAccess,
      prioritySupport: !!(limits as any).prioritySupport,
    },
    sub?.featureOverrides
  );

  return {
    plan,
    staff: { current: staffCount, limit: limits.maxStaff },
    services: { current: serviceCount, limit: limits.maxServices },
    bookingsThisMonth: { current: bookingCount, limit: limits.maxBookingsPerMonth },
    features: {
      ...effectiveFeatures,
      comped,
    },
  };
}
