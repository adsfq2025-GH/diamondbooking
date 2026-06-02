import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpFromHeaders } from "@/lib/audit";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  isComped: z.boolean().optional(),
  compExpiresAt: z.string().nullable().optional(),
  compNote: z.string().nullable().optional(),
  featureOverrides: z.record(z.string(), z.unknown()).optional(),
});

function parseDateOrNull(v: string | null | undefined) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const ip = getIpFromHeaders(req.headers);

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: { select: { subscription: { select: { id: true, isComped: true, compExpiresAt: true, featureOverrides: true } } } },
      },
    });
    if (!business) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const compExpiresAt = parseDateOrNull(parsed.data.compExpiresAt);
    const updateData: Record<string, unknown> = {};
    if (parsed.data.isComped !== undefined) updateData.isComped = parsed.data.isComped;
    if (compExpiresAt !== undefined) updateData.compExpiresAt = compExpiresAt;
    if (parsed.data.compNote !== undefined) updateData.compNote = parsed.data.compNote;
    if (parsed.data.featureOverrides !== undefined) updateData.featureOverrides = parsed.data.featureOverrides;

    const sub = await prisma.subscription.upsert({
      where: { userId: business.ownerId },
      create: {
        userId: business.ownerId,
        plan: "FREE",
        status: "INCOMPLETE",
        ...(updateData as any),
      },
      update: updateData as any,
      select: { id: true, isComped: true, compExpiresAt: true, compNote: true, featureOverrides: true },
    });

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "SUBSCRIPTION_FEATURE_OVERRIDES_UPDATED",
      targetType: "Subscription",
      targetId: sub.id,
      targetName: business.name,
      metadata: { businessId: business.id, ...parsed.data },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: sub });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update subscription" }, { status: 500 });
  }
}

