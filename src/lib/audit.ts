// src/lib/audit.ts
// Helper to write to the AuditLog table
// All Super Admin and important business actions must call this

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  // User actions
  | "USER_REGISTERED"
  | "USER_LOGGED_IN"
  | "USER_DISABLED"
  | "USER_ENABLED"
  | "USER_DELETED"
  | "USER_EMAIL_VERIFIED"
  | "USER_PASSWORD_RESET"
  | "USER_ROLE_CHANGED"
  // Business actions
  | "BUSINESS_CREATED"
  | "BUSINESS_UPDATED"
  | "BUSINESS_SUSPENDED"
  | "BUSINESS_REACTIVATED"
  | "BUSINESS_DELETED"
  | "BUSINESS_FEATURED"
  // Subscription actions
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_PLAN_CHANGED"
  | "SUBSCRIPTION_CANCELLED"
  | "SUBSCRIPTION_REACTIVATED"
  | "SUBSCRIPTION_COMPED"
  | "SUBSCRIPTION_TRIAL_EXTENDED"
  | "PAYMENT_FAILED"
  | "PAYMENT_SUCCEEDED"
  // Booking actions
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_COMPLETED"
  | "BOOKING_NO_SHOW"
  // Admin actions
  | "ADMIN_IMPERSONATED_USER"
  | "ADMIN_EXITED_IMPERSONATION"
  | "ADMIN_BROADCAST_EMAIL_SENT"
  | "ADMIN_MAINTENANCE_TOGGLED"
  | "ADMIN_SETTINGS_CHANGED"
  | "ADMIN_PLAN_MANUALLY_CHANGED";

export type AuditTargetType =
  | "User"
  | "Business"
  | "Subscription"
  | "Booking"
  | "Platform";

export interface CreateAuditLogInput {
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  isImpersonated?: boolean;
  impersonatorId?: string;
  impersonatorEmail?: string;
}

/**
 * Write an entry to the immutable audit log.
 * Fire-and-forget — errors are caught and logged but never throw.
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetName: input.targetName,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        isImpersonated: input.isImpersonated ?? false,
        impersonatorId: input.impersonatorId,
        impersonatorEmail: input.impersonatorEmail,
      },
    });
  } catch (error) {
    // Never let audit failures break the main flow
    console.error("[AuditLog] Failed to write:", error);
  }
}

/**
 * Extract IP address from request headers.
 * Handles Vercel/Cloudflare proxying.
 */
export function getIpFromHeaders(headers: Headers): string | undefined {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    undefined
  );
}

/**
 * Create a human-readable description for an audit action.
 */
export function getAuditActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    USER_REGISTERED: "User registered",
    USER_LOGGED_IN: "User logged in",
    USER_DISABLED: "User account disabled",
    USER_ENABLED: "User account enabled",
    USER_DELETED: "User deleted",
    USER_EMAIL_VERIFIED: "Email verified",
    USER_PASSWORD_RESET: "Password reset",
    USER_ROLE_CHANGED: "User role changed",
    BUSINESS_CREATED: "Business created",
    BUSINESS_UPDATED: "Business updated",
    BUSINESS_SUSPENDED: "Business suspended",
    BUSINESS_REACTIVATED: "Business reactivated",
    BUSINESS_DELETED: "Business deleted",
    BUSINESS_FEATURED: "Business featured",
    SUBSCRIPTION_CREATED: "Subscription created",
    SUBSCRIPTION_PLAN_CHANGED: "Subscription plan changed",
    SUBSCRIPTION_CANCELLED: "Subscription cancelled",
    SUBSCRIPTION_REACTIVATED: "Subscription reactivated",
    SUBSCRIPTION_COMPED: "Subscription comped",
    SUBSCRIPTION_TRIAL_EXTENDED: "Trial extended",
    PAYMENT_FAILED: "Payment failed",
    PAYMENT_SUCCEEDED: "Payment succeeded",
    BOOKING_CREATED: "Booking created",
    BOOKING_CONFIRMED: "Booking confirmed",
    BOOKING_CANCELLED: "Booking cancelled",
    BOOKING_COMPLETED: "Booking completed",
    BOOKING_NO_SHOW: "Booking marked no-show",
    ADMIN_IMPERSONATED_USER: "Admin started impersonation",
    ADMIN_EXITED_IMPERSONATION: "Admin exited impersonation",
    ADMIN_BROADCAST_EMAIL_SENT: "Broadcast email sent",
    ADMIN_MAINTENANCE_TOGGLED: "Maintenance mode toggled",
    ADMIN_SETTINGS_CHANGED: "Platform settings changed",
    ADMIN_PLAN_MANUALLY_CHANGED: "Plan manually changed by admin",
  };
  return labels[action] ?? action;
}
