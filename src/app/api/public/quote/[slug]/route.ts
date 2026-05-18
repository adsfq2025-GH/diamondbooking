import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { computeQuote } from "@/lib/pricing/engine";
import { isPromotionEligible, normalizePromoCode } from "@/lib/promotions/eligibility";

type Params = { params: Promise<{ slug: string }> };

const schema = z.object({
  serviceId: z.string(),
  intake: z.record(z.string(), z.unknown()).default({}),
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
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
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

  const customerType = parsed.data.isCommercial ? "commercial" : "residential";

  let membership: { discountPercent?: number | null } | undefined;
  let isMember = false;
  let isNewCustomer = false;
  let hasCustomerContext = false;

  if (parsed.data.customerEmail) {
    hasCustomerContext = true;
    const customer = await prisma.customer.findUnique({
      where: { businessId_email: { businessId: business.id, email: parsed.data.customerEmail.toLowerCase() } },
      select: { id: true },
    });
    if (customer) {
      const [active, priorBookings] = await Promise.all([
        prisma.customerMembership.findFirst({
          where: { businessId: business.id, customerId: customer.id, status: "ACTIVE" },
          select: { membershipPlan: { select: { discountPercent: true } } },
        }),
        prisma.booking.count({ where: { businessId: business.id, customerId: customer.id } }),
      ]);
      isMember = !!active;
      isNewCustomer = priorBookings === 0;
      membership = active ? { discountPercent: active.membershipPlan.discountPercent } : undefined;
    } else {
      isNewCustomer = true;
    }
  }

  const now = new Date();
  const promoCode = normalizePromoCode(parsed.data.promoCode);

  const baseSubtotal = computeQuote({
    basePrice: Number(service.price),
    currency: service.currency ?? business.currency,
    intake: parsed.data.intake,
    addOnKeys: parsed.data.addOnKeys,
    isCommercial: parsed.data.isCommercial,
    recurringInterval: undefined,
    promo: undefined,
    membership: undefined,
    config: config?.config ?? {},
  }).subtotal;

  const promotion =
    promoCode
      ? await prisma.promotion.findFirst({
          where: {
            businessId: business.id,
            code: promoCode,
            isActive: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
          },
          select: {
            type: true,
            percentOff: true,
            amountOff: true,
            freeAddonKey: true,
            appliesTo: true,
            minSubtotal: true,
            newCustomerOnly: true,
            memberOnly: true,
            stackable: true,
            usageLimit: true,
            usageCount: true,
          },
        })
      : null;

  const eligiblePromotion =
    promotion &&
    isPromotionEligible({
      promotion: {
        usageLimit: promotion.usageLimit,
        usageCount: promotion.usageCount,
        minSubtotal: promotion.minSubtotal ? Number(promotion.minSubtotal) : null,
        newCustomerOnly: promotion.newCustomerOnly,
        memberOnly: promotion.memberOnly,
        appliesTo: promotion.appliesTo,
      },
      baseSubtotal,
      serviceId: parsed.data.serviceId,
      addOnKeys: parsed.data.addOnKeys,
      customerType,
      isNewCustomer,
      isMember,
      hasCustomerContext,
    })
      ? promotion
      : null;

  const promo =
    eligiblePromotion && (eligiblePromotion.type === "PERCENT" || eligiblePromotion.type === "FIXED")
      ? {
          type: eligiblePromotion.type,
          percentOff: eligiblePromotion.percentOff,
          amountOff: eligiblePromotion.amountOff ? Number(eligiblePromotion.amountOff) : null,
        }
      : eligiblePromotion && eligiblePromotion.type === "FREE_ADDON"
        ? {
            type: "FREE_ADDON" as const,
            freeAddonKey: eligiblePromotion.freeAddonKey ?? null,
          }
        : undefined;

  const quote = computeQuote({
    basePrice: Number(service.price),
    currency: service.currency ?? business.currency,
    intake: parsed.data.intake,
    addOnKeys: parsed.data.addOnKeys,
    isCommercial: parsed.data.isCommercial,
    recurringInterval: promoCode && eligiblePromotion && !eligiblePromotion.stackable ? undefined : parsed.data.recurringInterval,
    promo,
    membership: promoCode && eligiblePromotion && !eligiblePromotion.stackable ? undefined : membership,
    config: config?.config ?? {},
  });

  return NextResponse.json({ success: true, data: quote });
}
