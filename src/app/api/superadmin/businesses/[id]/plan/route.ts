// src/app/api/superadmin/businesses/[id]/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpFromHeaders } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const { plan } = await req.json();
    const ip = getIpFromHeaders(req.headers);

    const business = await prisma.business.findUnique({
      where: { id },
      include: { owner: { include: { subscription: true } } },
    });
    if (!business) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const oldPlan = business.owner.subscription?.plan;

    await prisma.subscription.update({
      where: { userId: business.ownerId },
      data: { plan, status: "ACTIVE" },
    });

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "ADMIN_PLAN_MANUALLY_CHANGED",
      targetType: "Subscription",
      targetId: business.owner.subscription?.id ?? id,
      targetName: business.name,
      metadata: { oldPlan, newPlan: plan, businessId: id },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update plan" }, { status: 500 });
  }
}
