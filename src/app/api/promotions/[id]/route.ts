import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().trim().min(2).max(50).optional().nullable(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireOwner();
  if (!session.user.businessId) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });

  const promo = await prisma.promotion.update({
    where: { id, businessId: session.user.businessId },
    data: {
      name: parsed.data.name,
      code: parsed.data.code === undefined ? undefined : parsed.data.code ? parsed.data.code.toUpperCase() : null,
      isActive: parsed.data.isActive,
      startsAt: parsed.data.startsAt === undefined ? undefined : parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt === undefined ? undefined : parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    },
    select: { id: true, name: true, code: true, type: true, percentOff: true, amountOff: true, isActive: true, startsAt: true, endsAt: true, usageCount: true },
  });

  return NextResponse.json({ success: true, data: promo });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await requireOwner();
  if (!session.user.businessId) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  const { id } = await params;

  await prisma.promotion.delete({ where: { id, businessId: session.user.businessId } });
  return NextResponse.json({ success: true });
}

