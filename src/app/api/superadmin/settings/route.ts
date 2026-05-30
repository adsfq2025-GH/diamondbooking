// src/app/api/superadmin/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpFromHeaders } from "@/lib/audit";

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const body = await req.json();
    const ip = getIpFromHeaders(req.headers);

    const settings = await prisma.platformSettings.upsert({
      where: { id: 1 },
      update: {
        platformName: body.platformName,
        supportEmail: body.supportEmail,
        maintenanceMode: body.maintenanceMode,
        maintenanceMessage: body.maintenanceMessage,
        defaultTrialDays: body.defaultTrialDays,
        termsUrl: body.termsUrl || null,
        privacyUrl: body.privacyUrl || null,
        notifyNewSignup: body.notifyNewSignup,
        notifyPaymentFailure: body.notifyPaymentFailure,
        notifySubscriptionEnd: body.notifySubscriptionEnd,
        notifyBusinessSuspend: body.notifyBusinessSuspend,
      },
      create: { id: 1, ...body, updatedAt: new Date() },
    });

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: body.maintenanceMode !== undefined
        ? "ADMIN_MAINTENANCE_TOGGLED"
        : "ADMIN_SETTINGS_CHANGED",
      targetType: "Platform",
      targetId: "1",
      targetName: "Platform Settings",
      metadata: body,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
  }
}
