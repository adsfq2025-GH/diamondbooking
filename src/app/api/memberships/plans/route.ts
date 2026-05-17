import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  interval: z.enum(["MONTHLY", "YEARLY"]),
  price: z.number().min(0),
  currency: z.string().min(3).max(3).default("USD"),
  discountPercent: z.number().int().min(0).max(100).default(0),
  priorityBooking: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await requireOwner();
  if (!session.user.businessId) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });

  const plans = await prisma.membershipPlan.findMany({
    where: { businessId: session.user.businessId },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, name: true, interval: true, price: true, currency: true, discountPercent: true, priorityBooking: true, isActive: true },
  });

  return NextResponse.json({ success: true, data: plans });
}

export async function POST(req: NextRequest) {
  const session = await requireOwner();
  if (!session.user.businessId) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });

  const plan = await prisma.membershipPlan.create({
    data: {
      businessId: session.user.businessId,
      name: parsed.data.name,
      interval: parsed.data.interval,
      price: parsed.data.price,
      currency: parsed.data.currency,
      discountPercent: parsed.data.discountPercent,
      priorityBooking: parsed.data.priorityBooking,
      isActive: parsed.data.isActive,
    },
    select: { id: true, name: true, interval: true, price: true, currency: true, discountPercent: true, priorityBooking: true, isActive: true },
  });

  return NextResponse.json({ success: true, data: plan }, { status: 201 });
}

