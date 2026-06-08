import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { z } from "zod";
import { sendBookingConfirmation, sendNewBookingNotification } from "@/lib/email";
import { getAutomationsConfig } from "@/lib/automations/config";
import { scheduleRemindersForBooking } from "@/lib/automations/scheduler";
import { buildBookingSms, sendSms } from "@/lib/sms";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  bookingId: z.string().min(1),
  sessionId: z.string().min(1),
});

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { bookingId, sessionId } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            timezone: true,
            autoConfirm: true,
            owner: { select: { id: true, email: true } },
          },
        },
        service: { select: { name: true } },
        staff: { select: { name: true } },
        customer: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    if (booking.status === "CANCELLED") {
      return NextResponse.json({ success: false, error: "Booking was cancelled" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    const sessionBookingId = session.client_reference_id ?? session.metadata?.bookingId ?? null;

    if (!sessionBookingId || sessionBookingId !== bookingId) {
      return NextResponse.json({ success: false, error: "Payment session does not match booking" }, { status: 400 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 });
    }

    const stripePaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id
          ? session.payment_intent.id
          : null;

    const nextStatus = booking.business.autoConfirm ? "CONFIRMED" : "PENDING";

    const [businessConfig, updated] = await prisma.$transaction(async (tx) => {
      const businessConfig = await tx.businessConfig.findUnique({
        where: { businessId: booking.businessId },
        select: { config: true },
      });

      await tx.bookingPayment.upsert({
        where: { stripeCheckoutSessionId: sessionId },
        create: {
          bookingId,
          type: "checkout",
          status: "PAID",
          amount: session.amount_total ?? 0,
          currency: (session.currency ?? "usd").toUpperCase(),
          stripeCheckoutSessionId: sessionId,
          stripePaymentIntentId: stripePaymentIntentId ?? undefined,
        },
        update: {
          status: "PAID",
          stripePaymentIntentId: stripePaymentIntentId ?? undefined,
        },
      });

      const updatedBooking =
        booking.status === "PENDING_PAYMENT"
          ? await tx.booking.update({ where: { id: bookingId }, data: { status: nextStatus } })
          : booking;

      return [businessConfig, updatedBooking] as const;
    });

    await createAuditLog({
      action: "PAYMENT_SUCCEEDED",
      targetType: "Booking",
      targetId: bookingId,
      targetName: `${booking.customer.name} — ${booking.service.name}`,
      metadata: { businessId: booking.businessId, stripeCheckoutSessionId: sessionId },
    });

    const automations = getAutomationsConfig(businessConfig?.config ?? {});
    const notifyEmailConfirmation = automations.notifications.email && automations.notifications.confirmation.email;
    const notifySmsConfirmation = automations.notifications.sms && automations.notifications.confirmation.sms;

    await Promise.all([
      notifyEmailConfirmation
        ? sendBookingConfirmation({
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            businessName: booking.business.name,
            serviceName: booking.service.name,
            staffName: booking.staff.name,
            startTime: booking.startTime,
            timezone: booking.business.timezone,
            bookingId,
            notes: booking.notes ?? undefined,
          })
        : Promise.resolve(),
      booking.business.owner.email
        ? sendNewBookingNotification({
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            businessName: booking.business.name,
            serviceName: booking.service.name,
            staffName: booking.staff.name,
            startTime: booking.startTime,
            timezone: booking.business.timezone,
            bookingId,
            notes: booking.notes ?? undefined,
            ownerEmail: booking.business.owner.email,
          })
        : Promise.resolve(),
    ]);

    if (notifySmsConfirmation && booking.customer.phone) {
      const bookingUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/book/${booking.business.slug}`
        : undefined;
      const body = buildBookingSms({
        type: "BOOKING_CONFIRMATION",
        businessName: booking.business.name,
        serviceName: booking.service.name,
        staffName: booking.staff.name,
        startTime: booking.startTime,
        timezone: booking.business.timezone,
        customerName: booking.customer.name,
        bookingUrl,
      });
      try {
        await sendSms({ to: booking.customer.phone, body });
      } catch {}
    }

    await scheduleRemindersForBooking({ bookingId });

    return NextResponse.json({
      success: true,
      data: {
        bookingId,
        status: updated.status,
        serviceName: booking.service.name,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        customerEmail: booking.customer.email,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to confirm payment";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
