import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().trim().min(2).max(50).optional().nullable(),
  type: z.enum(["PERCENT", "FIXED", "FREE_ADDON"]).optional(),
  percentOff: z.number().int().min(1).max(100).optional().nullable(),
  amountOff: z.number().min(0.01).optional().nullable(),
  freeAddonKey: z.string().trim().min(1).max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  appliesTo: z
    .object({
      services: z.array(z.string()).optional(),
      addOns: z.array(z.string()).optional(),
      customerType: z.enum(["residential", "commercial"]).optional(),
    })
    .optional()
    .nullable(),
  minSubtotal: z.number().min(0).optional().nullable(),
  newCustomerOnly: z.boolean().optional(),
  memberOnly: z.boolean().optional(),
  stackable: z.boolean().optional(),
  usageLimit: z.number().int().min(1).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireOwner();
  if (!session.user.businessId) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });

  const existing = await prisma.promotion.findFirst({
    where: { id, businessId: session.user.businessId },
    select: { type: true, percentOff: true, amountOff: true, freeAddonKey: true },
  });
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const nextType = parsed.data.type ?? existing.type;

  const nextPercentOff =
    nextType === "PERCENT"
      ? parsed.data.percentOff === undefined
        ? existing.percentOff
        : parsed.data.percentOff
      : null;

  const nextAmountOff =
    nextType === "FIXED"
      ? parsed.data.amountOff === undefined
        ? existing.amountOff
        : parsed.data.amountOff
      : null;

  const nextFreeAddonKey =
    nextType === "FREE_ADDON"
      ? parsed.data.freeAddonKey === undefined
        ? existing.freeAddonKey
        : parsed.data.freeAddonKey
      : null;

  if (nextType === "PERCENT" && (!nextPercentOff || nextPercentOff <= 0)) {
    return NextResponse.json({ success: false, error: "percentOff is required for percent promotions" }, { status: 400 });
  }
  if (nextType === "FIXED" && (!nextAmountOff || Number(nextAmountOff) <= 0)) {
    return NextResponse.json({ success: false, error: "amountOff is required for fixed promotions" }, { status: 400 });
  }
  if (nextType === "FREE_ADDON" && !nextFreeAddonKey) {
    return NextResponse.json({ success: false, error: "freeAddonKey is required for FREE_ADDON promotions" }, { status: 400 });
  }

  const promo = await prisma.promotion.update({
    where: { id, businessId: session.user.businessId },
    data: {
      name: parsed.data.name,
      code: parsed.data.code === undefined ? undefined : parsed.data.code ? parsed.data.code.toUpperCase() : null,
      type: parsed.data.type,
      percentOff: nextType === "PERCENT" ? (nextPercentOff ?? null) : null,
      amountOff: nextType === "FIXED" ? (nextAmountOff ?? null) : null,
      freeAddonKey: nextType === "FREE_ADDON" ? (nextFreeAddonKey ?? null) : null,
      isActive: parsed.data.isActive,
      startsAt: parsed.data.startsAt === undefined ? undefined : parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt === undefined ? undefined : parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      appliesTo:
        parsed.data.appliesTo === undefined
          ? undefined
          : parsed.data.appliesTo === null
            ? Prisma.JsonNull
            : parsed.data.appliesTo,
      minSubtotal: parsed.data.minSubtotal === undefined ? undefined : parsed.data.minSubtotal,
      newCustomerOnly: parsed.data.newCustomerOnly,
      memberOnly: parsed.data.memberOnly,
      stackable: parsed.data.stackable,
      usageLimit: parsed.data.usageLimit === undefined ? undefined : parsed.data.usageLimit,
    },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      percentOff: true,
      amountOff: true,
      freeAddonKey: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      appliesTo: true,
      minSubtotal: true,
      newCustomerOnly: true,
      memberOnly: true,
      stackable: true,
      usageLimit: true,
      usageCount: true,
    },
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
