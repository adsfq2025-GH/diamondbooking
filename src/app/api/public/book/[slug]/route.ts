// src/app/api/public/book/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAcceptBooking } from "@/lib/plan-limits";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { computeQuote } from "@/lib/pricing/engine";
import { sendBookingConfirmation, sendNewBookingNotification } from "@/lib/email";
import { Prisma } from "@prisma/client";
import { isPromotionEligible, normalizePromoCode } from "@/lib/promotions/eligibility";
import { getAutomationsConfig } from "@/lib/automations/config";
import { scheduleRemindersForBooking } from "@/lib/automations/scheduler";
import { buildBookingSms, sendSms } from "@/lib/sms";
import { addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import Stripe from "stripe";
import { getPublicAppUrl } from "@/lib/widget-embed";

type Params = { params: Promise<{ slug: string }> };

const schema = z.object({
  serviceId:     z.string(),
  staffId:       z.string(),
  date:          z.string(), // YYYY-MM-DD
  startTime:     z.string(), // ISO UTC datetime
  endTime:       z.string(), // ISO UTC datetime
  durationMinutes: z.number().int().min(5).max(480).optional(),
  customerName:  z.string().min(1).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  notes:         z.string().max(500).optional(),
  intake: z.record(z.string(), z.unknown()).optional(),
  addOnKeys:     z.array(z.string()).optional(),
  isCommercial:  z.boolean().optional(),
  recurringInterval: z.string().optional(),
  promoCode:     z.string().trim().min(1).max(50).optional(),
  embed: z.boolean().optional(),
});

function hash32(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

function toCents(amount: number) {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount * 100));
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    include: {
      businessHours: true,
      owner: {
        select: {
          id: true,
          email: true,
          subscription: { select: { plan: true, status: true, trialEnd: true, isComped: true, compExpiresAt: true } },
        },
      },
    },
  });
  if (!business) {
    return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  }

  // Check subscription active
  const sub = business.owner.subscription;
  const comped = !!sub?.isComped && (!sub.compExpiresAt || sub.compExpiresAt.getTime() > Date.now());
  const subStatus = sub?.status;
  const trialActive = subStatus === "TRIALING" && (!sub?.trialEnd || sub.trialEnd.getTime() > Date.now());
  if (subStatus && !comped && !(subStatus === "ACTIVE" || trialActive)) {
    return NextResponse.json(
      { success: false, error: "This business is not currently accepting bookings" },
      { status: 403 }
    );
  }

  // Check booking limit
  const limitCheck = await canAcceptBooking(business.id);
  if (!limitCheck.allowed) {
    return NextResponse.json({ success: false, error: "This business has reached its monthly booking limit" }, { status: 429 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const {
    serviceId,
    staffId,
    date,
    startTime,
    endTime,
    durationMinutes,
    customerName,
    customerEmail,
    customerPhone,
    notes,
    intake,
    addOnKeys,
    isCommercial,
    recurringInterval,
    promoCode,
          embed,
  } = parsed.data;

  // Verify service belongs to this business
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id, isActive: true },
  });
  if (!service) return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });

  // Verify staff belongs to this business and can perform service
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, businessId: business.id, isActive: true, services: { some: { serviceId } } },
    include: { availability: true },
  });
  if (!staff) return NextResponse.json({ success: false, error: "Staff member not available" }, { status: 404 });

  const slotStart = new Date(startTime);
  const slotEnd   = new Date(endTime);
  const actualDurationMinutes = Math.round((slotEnd.getTime() - slotStart.getTime()) / 60_000);

  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime())) {
    return NextResponse.json({ success: false, error: "Invalid time selection" }, { status: 400 });
  }

  const tz = business.timezone;
  const [y, m, d] = date.split("-").map((x) => Number(x));
  if (!y || !m || !d) return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });
  const dateLocal = new Date(y, m - 1, d, 0, 0, 0, 0);

  const nowUtc = new Date();
  const minBookingTime = new Date(nowUtc.getTime() + business.minimumNoticeHours * 60 * 60 * 1000);
  if (slotStart < minBookingTime) {
    return NextResponse.json({ success: false, error: "This time is too soon to book" }, { status: 400 });
  }

  const nowLocal = toZonedTime(nowUtc, tz);
  const todayLocalMidnight = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 0, 0, 0, 0);
  const maxLocalDate = addDays(todayLocalMidnight, business.advanceBookingDays);
  if (toZonedTime(fromZonedTime(dateLocal, tz), tz) > maxLocalDate) {
    return NextResponse.json({ success: false, error: "This date is outside the booking window" }, { status: 400 });
  }

  const dayOfWeek = toZonedTime(fromZonedTime(dateLocal, tz), tz).getDay();
  const staffAvail = staff.availability.find((a) => a.dayOfWeek === dayOfWeek);
  const bizHours = business.businessHours.find((h) => h.dayOfWeek === dayOfWeek);
  const dayHours = staffAvail ?? bizHours;
  if (!dayHours || dayHours.isClosed) {
    return NextResponse.json({ success: false, error: "Selected date is not available" }, { status: 400 });
  }

  const openUtc = fromZonedTime(
    new Date(y, m - 1, d, Number(dayHours.openTime.split(":")[0] ?? 0), Number(dayHours.openTime.split(":")[1] ?? 0), 0, 0),
    tz
  );
  const closeUtc = fromZonedTime(
    new Date(y, m - 1, d, Number(dayHours.closeTime.split(":")[0] ?? 0), Number(dayHours.closeTime.split(":")[1] ?? 0), 0, 0),
    tz
  );

  if (slotStart < openUtc || slotEnd > closeUtc) {
    return NextResponse.json({ success: false, error: "Selected time is outside availability" }, { status: 400 });
  }

  if (service.billingUnit === "PER_HOUR") {
    const min = service.minDurationMinutes ?? service.duration;
    const requested = durationMinutes ?? actualDurationMinutes;
    if (requested !== actualDurationMinutes) {
      return NextResponse.json({ success: false, error: "Invalid duration selection" }, { status: 400 });
    }
    if (actualDurationMinutes < min) {
      return NextResponse.json({ success: false, error: `Minimum booking is ${Math.ceil(min / 60)} hour(s)` }, { status: 400 });
    }
  } else {
    const expectedMs = service.duration * 60_000;
    if (slotEnd.getTime() - slotStart.getTime() !== expectedMs) {
      return NextResponse.json({ success: false, error: "Invalid slot duration" }, { status: 400 });
    }
  }

  // Upsert customer (unique per business+email)
  const customer = await prisma.customer.upsert({
    where: { businessId_email: { businessId: business.id, email: customerEmail.toLowerCase() } },
    update: { name: customerName, phone: customerPhone ?? undefined },
    create: {
      businessId: business.id,
      name: customerName,
      email: customerEmail.toLowerCase(),
      phone: customerPhone ?? null,
    },
  });

  const [config, activeMembership] = await Promise.all([
    prisma.businessConfig.findUnique({ where: { businessId: business.id }, select: { config: true } }),
    prisma.customerMembership.findFirst({
      where: { businessId: business.id, customerId: customer.id, status: "ACTIVE" },
      select: { membershipPlan: { select: { discountPercent: true } } },
    }),
  ]);

  const now = new Date();
  const normalizedPromoCode = normalizePromoCode(promoCode);
  const customerType = (isCommercial ?? false) ? "commercial" : "residential";
  const priorBookings = await prisma.booking.count({ where: { businessId: business.id, customerId: customer.id } });
  const isNewCustomer = priorBookings === 0;
  const isMember = !!activeMembership;

  const basePrice =
    service.billingUnit === "PER_HOUR"
      ? Number(service.price) * (actualDurationMinutes / 60)
      : Number(service.price);

  const baseSubtotal = computeQuote({
    basePrice,
    currency: service.currency,
    intake: intake ?? {},
    addOnKeys: addOnKeys ?? [],
    isCommercial: isCommercial ?? false,
    recurringInterval: undefined,
    promo: undefined,
    membership: undefined,
    config: config?.config ?? {},
  }).subtotal;

  const promotion =
    normalizedPromoCode
      ? await prisma.promotion.findFirst({
          where: {
            businessId: business.id,
            code: normalizedPromoCode,
            isActive: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
          },
          select: {
            id: true,
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
      serviceId,
      addOnKeys: addOnKeys ?? [],
      customerType,
      isNewCustomer,
      isMember,
      hasCustomerContext: true,
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
        ? { type: "FREE_ADDON" as const, freeAddonKey: eligiblePromotion.freeAddonKey ?? null }
        : undefined;

  const quote = computeQuote({
    basePrice,
    currency: service.currency,
    intake: intake ?? {},
    addOnKeys: addOnKeys ?? [],
    isCommercial: isCommercial ?? false,
    recurringInterval: normalizedPromoCode && eligiblePromotion && !eligiblePromotion.stackable ? undefined : recurringInterval,
    promo,
    membership:
      normalizedPromoCode && eligiblePromotion && !eligiblePromotion.stackable
        ? undefined
        : activeMembership
          ? { discountPercent: activeMembership.membershipPlan.discountPercent }
          : undefined,
    config: config?.config ?? {},
  });

  const cfgObj =
    config?.config && typeof config.config === "object" ? (config.config as Record<string, any>) : ({} as Record<string, any>);
  const paymentsCfg = cfgObj.payments && typeof cfgObj.payments === "object" ? (cfgObj.payments as Record<string, any>) : null;
  const paymentTypeRaw =
    typeof paymentsCfg?.paymentType === "string"
      ? paymentsCfg.paymentType
      : typeof paymentsCfg?.mode === "string"
        ? paymentsCfg.mode
        : null;
  const paymentType = paymentTypeRaw === "deposit" ? "deposit" : paymentTypeRaw === "full" ? "full" : null;
  const depositPercentageRaw =
    typeof paymentsCfg?.depositPercentage === "number"
      ? paymentsCfg.depositPercentage
      : typeof paymentsCfg?.depositPercent === "number"
        ? paymentsCfg.depositPercent
        : 20;
  const depositPercentage = Number.isFinite(depositPercentageRaw) ? Math.max(1, Math.min(100, Math.floor(depositPercentageRaw))) : 20;

  const totalCents = toCents(Number(quote.total));
  const shouldCollectPayment =
    totalCents > 0 &&
    !!business.stripeConnectAccountId &&
    !!business.stripeChargesEnabled &&
    (paymentType === "full" || paymentType === "deposit");

  const chargeCents =
    paymentType === "deposit" ? Math.max(1, Math.round((totalCents * depositPercentage) / 100)) : totalCents;

  const intakeJson = (intake ?? {}) as Prisma.InputJsonValue;

  type BookingWithRelations = Prisma.BookingGetPayload<{
    include: {
      service: { select: { name: true; duration: true } };
      staff: { select: { name: true } };
    };
  }>;

  let booking: BookingWithRelations;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const key1 = hash32(`${business.id}:${staffId}`);
      const key2 = Math.floor(slotStart.getTime() / 86_400_000);
      // Cast to int4 so Postgres resolves the two-argument overload. The pg
      // adapter binds JS numbers as bigint, and pg_advisory_xact_lock(bigint,
      // bigint) does not exist — only (int4, int4) and (bigint).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${key1}::int, ${key2}::int)`;

      const conflict = await tx.booking.findFirst({
        where: {
          businessId: business.id,
          staffId,
          status: { in: ["CONFIRMED", "PENDING", "PENDING_PAYMENT"] },
          startTime: { lt: slotEnd },
          endTime: { gt: slotStart },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new Error("SLOT_CONFLICT");
      }

      const created = await tx.booking.create({
        data: {
          businessId: business.id,
          serviceId,
          staffId,
          customerId: customer.id,
          date: new Date(Date.UTC(slotStart.getUTCFullYear(), slotStart.getUTCMonth(), slotStart.getUTCDate())),
          startTime: slotStart,
          endTime: slotEnd,
          status: shouldCollectPayment ? "PENDING_PAYMENT" : business.autoConfirm ? "CONFIRMED" : "PENDING",
          notes: notes ?? null,
          totalPrice: quote.total,
          intakeData: intakeJson,
          pricingData: quote,
          promoCode: normalizedPromoCode ?? null,
          recurringInterval: recurringInterval ?? null,
          isCommercial: isCommercial ?? false,
          source: "booking_page",
        },
        include: {
          service: { select: { name: true, duration: true } },
          staff: { select: { name: true } },
        },
      });

      if (eligiblePromotion) {
        const where =
          eligiblePromotion.usageLimit != null
            ? { id: eligiblePromotion.id, usageCount: { lt: eligiblePromotion.usageLimit } }
            : { id: eligiblePromotion.id };
        const updated = await tx.promotion.updateMany({
          where,
          data: { usageCount: { increment: 1 } },
        });
        if (updated.count !== 1) {
          throw new Error("PROMO_USAGE_LIMIT_REACHED");
        }

        await tx.promotionRedemption.create({
          data: {
            promotionId: eligiblePromotion.id,
            businessId: business.id,
            customerId: customer.id,
            bookingId: created.id,
          },
        });
      }

      return created;
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "SLOT_CONFLICT") {
      return NextResponse.json({ success: false, error: "This time slot is no longer available" }, { status: 409 });
    }
    if (e instanceof Error && e.message === "PROMO_USAGE_LIMIT_REACHED") {
      return NextResponse.json({ success: false, error: "Promotion usage limit reached" }, { status: 400 });
    }
    throw e;
  }

  await createAuditLog({
    action: "BOOKING_CREATED",
    targetType: "Booking",
    targetId: booking.id,
    targetName: `${customerName} — ${service.name}`,
    metadata: { businessId: business.id, source: "booking_page" },
  });

  if (shouldCollectPayment) {
    try {
      const stripe = getStripe();
      const appUrl = getPublicAppUrl();
      const destination = business.stripeConnectAccountId;
      if (!destination) throw new Error("Payments are not enabled for this business");
      const embedQs = embed ? "&embed=1" : "";
      const successUrl = `${appUrl}/book/${business.slug}?payment=success&bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}${embedQs}`;
      const cancelUrl = `${appUrl}/book/${business.slug}?payment=cancel&bookingId=${booking.id}${embedQs}`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: booking.id,
        customer_email: customerEmail.toLowerCase(),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: service.currency.toLowerCase(),
              unit_amount: chargeCents,
              product_data: {
                name: `${business.name} — ${service.name}`,
              },
            },
          },
        ],
        payment_intent_data: {
          transfer_data: { destination },
          metadata: {
            bookingId: booking.id,
            businessId: business.id,
            businessSlug: business.slug,
          },
        },
        metadata: {
          bookingId: booking.id,
          businessId: business.id,
          businessSlug: business.slug,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      await prisma.bookingPayment.create({
        data: {
          bookingId: booking.id,
          type: paymentType === "deposit" ? "deposit" : "full",
          status: "CHECKOUT_CREATED",
          amount: chargeCents,
          currency: service.currency,
          stripeCheckoutSessionId: session.id,
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            bookingId: booking.id,
            status: booking.status,
            payment: {
              required: true,
              checkoutUrl: session.url,
              amount: chargeCents,
              currency: service.currency,
              paymentType,
              mode: paymentType,
            },
          },
        },
        { status: 201 }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment setup failed";
      return NextResponse.json(
        {
          success: true,
          data: {
            bookingId: booking.id,
            status: booking.status,
            payment: { required: true, checkoutUrl: null, error: msg },
          },
        },
        { status: 201 }
      );
    }
  }

  const automations = getAutomationsConfig(config?.config ?? {});

  const notifyEmailConfirmation = automations.notifications.email && automations.notifications.confirmation.email;
  const notifySmsConfirmation = automations.notifications.sms && automations.notifications.confirmation.sms;

  await Promise.all([
    notifyEmailConfirmation
      ? sendBookingConfirmation({
          customerName,
          customerEmail,
          businessName: business.name,
          serviceName: booking.service.name,
          staffName: booking.staff.name,
          startTime: booking.startTime,
          timezone: business.timezone,
          bookingId: booking.id,
          notes: booking.notes ?? undefined,
        })
      : Promise.resolve(),
    business.owner.email
      ? sendNewBookingNotification({
          customerName,
          customerEmail,
          businessName: business.name,
          serviceName: booking.service.name,
          staffName: booking.staff.name,
          startTime: booking.startTime,
          timezone: business.timezone,
          bookingId: booking.id,
          notes: booking.notes ?? undefined,
          ownerEmail: business.owner.email,
        })
      : Promise.resolve(),
  ]);

  if (notifySmsConfirmation && customerPhone) {
    const bookingUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/book/${business.slug}`
      : undefined;
    const body = buildBookingSms({
      type: "BOOKING_CONFIRMATION",
      businessName: business.name,
      serviceName: booking.service.name,
      staffName: booking.staff.name,
      startTime: booking.startTime,
      timezone: business.timezone,
      customerName,
      bookingUrl,
    });
    try {
      await sendSms({ to: customerPhone, body });
    } catch (e) {
      console.error("[sms] Confirmation failed:", e instanceof Error ? e.message : e);
    }
  }

  await scheduleRemindersForBooking({ bookingId: booking.id });

  return NextResponse.json({
    success: true,
    data: {
      bookingId:   booking.id,
      status:      booking.status,
      serviceName: booking.service.name,
      staffName:   booking.staff.name,
      startTime:   booking.startTime,
      endTime:     booking.endTime,
      customerName,
      customerEmail,
    },
  }, { status: 201 });
}
