import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireOwner();
  if (!session.user.businessId) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });

  const updated = await prisma.membershipPlan.update({
    where: { id, businessId: session.user.businessId },
    data: parsed.data,
    select: { id: true, name: true, interval: true, price: true, currency: true, discountPercent: true, priorityBooking: true, isActive: true },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await requireOwner();
  if (!session.user.businessId) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  const { id } = await params;

  await prisma.membershipPlan.delete({ where: { id, businessId: session.user.businessId } });
  return NextResponse.json({ success: true });
}

