import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpFromHeaders } from "@/lib/audit";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  priceMonthly: z.number().nonnegative().optional(),
  priceYearly: z.number().nonnegative().optional(),
  maxStaff: z.number().int().optional(),
  maxServices: z.number().int().optional(),
  maxBookingsPerMonth: z.number().int().optional(),
  removesBranding: z.boolean().optional(),
  emailReminders: z.boolean().optional(),
  customDomain: z.boolean().optional(),
  apiAccess: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const ip = getIpFromHeaders(req.headers);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const updated = await prisma.planConfig.update({
      where: { id },
      data: {
        ...parsed.data,
        priceMonthly: parsed.data.priceMonthly !== undefined ? parsed.data.priceMonthly : undefined,
        priceYearly: parsed.data.priceYearly !== undefined ? parsed.data.priceYearly : undefined,
      } as any,
    });

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "ADMIN_SETTINGS_CHANGED",
      targetType: "Platform",
      targetId: "1",
      targetName: "Plan Config",
      metadata: { planConfigId: id, changes: parsed.data },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update plan config" }, { status: 500 });
  }
}

