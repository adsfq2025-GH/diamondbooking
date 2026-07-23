import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { z } from "zod";
import { getPublicAppUrl } from "@/lib/widget-embed";

const schema = z.object({
  bookingId: z.string().min(1),
  embed: z.boolean().optional(),
});

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

function toCents(amount: number) {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount * 100));
}

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { bookingId, embed } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            stripeConnectAccountId: true,
            stripeChargesEnabled: true,
          },
        },
        service: { select: { name: true, currency: true } },
      },
    });

    if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    if (booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ success: false, error: "Booking is not awaiting payment" }, { status: 400 });
    }

    if (!booking.business.stripeConnectAccountId || !booking.business.stripeChargesEnabled) {
      return NextResponse.json({ success: false, error: "Payments are not enabled for this business" }, { status: 400 });
    }

    const businessConfig = await prisma.businessConfig.findUnique({
      where: { businessId: booking.businessId },
      select: { config: true },
    });

    const cfgObj =
      businessConfig?.config && typeof businessConfig.config === "object"
        ? (businessConfig.config as Record<string, any>)
        : ({} as Record<string, any>);
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

    const totalCents = toCents(Number(booking.totalPrice));
    if (totalCents <= 0) {
      return NextResponse.json({ success: false, error: "This booking does not require payment" }, { status: 400 });
    }

    const chargeCents =
      paymentType === "deposit" ? Math.max(1, Math.round((totalCents * depositPercentage) / 100)) : totalCents;

    const stripe = getStripe();

    const existingPayment = await prisma.bookingPayment.findFirst({
      where: {
        bookingId: booking.id,
        status: "CHECKOUT_CREATED",
      },
      orderBy: { createdAt: "desc" },
      select: { stripeCheckoutSessionId: true },
    });

    if (existingPayment?.stripeCheckoutSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(existingPayment.stripeCheckoutSessionId);
        if (session.status === "open" && session.url) {
          return NextResponse.json({
            success: true,
            data: {
              bookingId: booking.id,
              checkoutUrl: session.url,
              amount: chargeCents,
              currency: booking.service.currency,
              paymentType,
              mode: paymentType,
            },
          });
        }
      } catch {
        // If the old session is gone or expired, create a fresh one.
      }
    }

    const appUrl = getPublicAppUrl();
    const embedQs = embed ? "&embed=1" : "";
    const successUrl = `${appUrl}/book/${booking.business.slug}?payment=success&bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}${embedQs}`;
    const cancelUrl = `${appUrl}/book/${booking.business.slug}?payment=cancel&bookingId=${booking.id}${embedQs}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: booking.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: booking.service.currency.toLowerCase(),
            unit_amount: chargeCents,
            product_data: {
              name: `${booking.business.name} — ${booking.service.name}`,
            },
          },
        },
      ],
      payment_intent_data: {
        transfer_data: { destination: booking.business.stripeConnectAccountId },
        metadata: {
          bookingId: booking.id,
          businessId: booking.business.id,
          businessSlug: booking.business.slug,
        },
      },
      metadata: {
        bookingId: booking.id,
        businessId: booking.business.id,
        businessSlug: booking.business.slug,
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
        currency: booking.service.currency,
        stripeCheckoutSessionId: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        checkoutUrl: session.url,
        amount: chargeCents,
        currency: booking.service.currency,
        paymentType,
        mode: paymentType,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create payment link";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
