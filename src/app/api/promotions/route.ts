import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().trim().min(2).max(50).optional(),
  type: z.enum(["PERCENT", "FIXED"]),
  percentOff: z.number().int().min(1).max(100).optional(),
  amountOff: z.number().min(0.01).optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await requireOwner();
  if (!session.user.businessId) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });

  const promos = await prisma.promotion.findMany({
    where: { businessId: session.user.businessId },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, name: true, code: true, type: true, percentOff: true, amountOff: true, isActive: true, startsAt: true, endsAt: true, usageCount: true },
  });

  return NextResponse.json({ success: true, data: promos });
}

export async function POST(req: NextRequest) {
  const session = await requireOwner();
  if (!session.user.businessId) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });

  if (parsed.data.type === "PERCENT" && !parsed.data.percentOff) {
    return NextResponse.json({ success: false, error: "percentOff is required for percent promotions" }, { status: 400 });
  }
  if (parsed.data.type === "FIXED" && !parsed.data.amountOff) {
    return NextResponse.json({ success: false, error: "amountOff is required for fixed promotions" }, { status: 400 });
  }

  const promo = await prisma.promotion.create({
    data: {
      businessId: session.user.businessId,
      name: parsed.data.name,
      code: parsed.data.code ? parsed.data.code.toUpperCase() : null,
      type: parsed.data.type,
      percentOff: parsed.data.type === "PERCENT" ? parsed.data.percentOff ?? null : null,
      amountOff: parsed.data.type === "FIXED" ? parsed.data.amountOff ?? null : null,
      isActive: parsed.data.isActive,
    },
    select: { id: true, name: true, code: true, type: true, percentOff: true, amountOff: true, isActive: true, startsAt: true, endsAt: true, usageCount: true },
  });

  return NextResponse.json({ success: true, data: promo }, { status: 201 });
}

