import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { computeQuote } from "@/lib/pricing/engine";

type Params = { params: Promise<{ slug: string }> };

const schema = z.object({
  serviceId: z.string(),
  intake: z.record(z.unknown()).default({}),
  addOnKeys: z.array(z.string()).default([]),
  isCommercial: z.boolean().default(false),
  recurringInterval: z.string().optional(),
  promoCode: z.string().trim().min(1).max(50).optional(),
  customerEmail: z.string().email().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: { id: true, currency: true },
  });
  if (!business) {
    return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, businessId: business.id, isActive: true },
    select: { price: true, currency: true },
  });
  if (!service) {
    return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
  }

  const config = await prisma.businessConfig.findUnique({
    where: { businessId: business.id },
    select: { config: true },
  });

  let promo:
    | { type: "PERCENT" | "FIXED"; percentOff?: number | null; amountOff?: number | null }
    | undefined;

  if (parsed.data.promoCode) {
    const p = await prisma.promotion.findFirst({
      where: {
        businessId: business.id,
        code: parsed.data.promoCode,
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          },
        ],
      },
      select: { type: true, percentOff: true, amountOff: true },
    });

    if (p?.type === "PERCENT" || p?.type === "FIXED") {
      promo = {
        type: p.type,
        percentOff: p.percentOff,
        amountOff: p.amountOff ? Number(p.amountOff) : null,
      };
    }
  }

  let membership: { discountPercent?: number | null } | undefined;
  if (parsed.data.customerEmail) {
    const customer = await prisma.customer.findUnique({
      where: { businessId_email: { businessId: business.id, email: parsed.data.customerEmail.toLowerCase() } },
      select: { id: true },
    });
    if (customer) {
      const active = await prisma.customerMembership.findFirst({
        where: { businessId: business.id, customerId: customer.id, status: "ACTIVE" },
        select: { membershipPlan: { select: { discountPercent: true } } },
      });
      membership = active ? { discountPercent: active.membershipPlan.discountPercent } : undefined;
    }
  }

  const quote = computeQuote({
    basePrice: Number(service.price),
    currency: service.currency ?? business.currency,
    intake: parsed.data.intake,
    addOnKeys: parsed.data.addOnKeys,
    isCommercial: parsed.data.isCommercial,
    recurringInterval: parsed.data.recurringInterval,
    promo,
    membership,
    config: config?.config ?? {},
  });

  return NextResponse.json({ success: true, data: quote });
}

