import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  industryKey: z.string().optional(),
  config: z.unknown(),
});

export async function GET() {
  const session = await requireOwner();
  if (!session.user.businessId) {
    return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  }

  const cfg = await prisma.businessConfig.findUnique({
    where: { businessId: session.user.businessId },
    select: { industryKey: true, config: true, pricingVersion: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, data: cfg });
}

export async function PUT(req: NextRequest) {
  const session = await requireOwner();
  if (!session.user.businessId) {
    return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (parsed.data.config === null || typeof parsed.data.config !== "object") {
    return NextResponse.json({ success: false, error: "Config must be an object" }, { status: 400 });
  }

  const updated = await prisma.businessConfig.update({
    where: { businessId: session.user.businessId },
    data: {
      industryKey: parsed.data.industryKey,
      config: parsed.data.config as object,
      pricingVersion: { increment: 1 },
    },
    select: { industryKey: true, config: true, pricingVersion: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, data: updated });
}

