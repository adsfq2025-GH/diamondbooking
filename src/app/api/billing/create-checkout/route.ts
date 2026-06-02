// src/app/api/billing/create-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

const PLAN_PRICES: Record<string, { monthly?: string; yearly?: string }> = {
  STARTER:      { monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,      yearly: process.env.STRIPE_PRICE_STARTER_YEARLY },
  PROFESSIONAL: { monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,          yearly: process.env.STRIPE_PRICE_PRO_YEARLY },
  ENTERPRISE:   { monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,   yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY },
};

export async function GET(req: NextRequest) {
  try {
    if (req.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const session  = await requireOwner();
    const { searchParams } = req.nextUrl;
    const plan     = searchParams.get("plan") ?? "STARTER";
    const interval = searchParams.get("interval") ?? "monthly";
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.diamond-booking.com";
    const trialDaysParam = searchParams.get("trialDays");
    const returnToParam = searchParams.get("returnTo");
    const cancelToParam = searchParams.get("cancelTo");

    const priceId = PLAN_PRICES[plan]?.[interval as "monthly" | "yearly"];
    if (!priceId) {
      return NextResponse.redirect(`${appUrl}/dashboard/billing?error=invalid_plan`);
    }

    const stripe = getStripe();

    // Get or create Stripe customer
    const subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
    let stripeCustomerId = subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      const customer = await stripe.customers.create({
        email: user?.email ?? undefined,
        name:  user?.name  ?? undefined,
        metadata: { userId: session.user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.subscription.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          stripeCustomerId,
          plan: "FREE",
          status: "INCOMPLETE",
        },
        update: { stripeCustomerId },
      });
    }

    const safeRelative = (value: string | null) => {
      if (!value) return null;
      if (!value.startsWith("/")) return null;
      if (value.startsWith("//")) return null;
      return value;
    };

    const successReturn = safeRelative(returnToParam) ?? "/dashboard/billing";
    const cancelReturn = safeRelative(cancelToParam) ?? "/dashboard/billing";
    const successUrl = `${appUrl}${successReturn}${successReturn.includes("?") ? "&" : "?"}success=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}${cancelReturn}${cancelReturn.includes("?") ? "&" : "?"}canceled=1`;

    const settings = await prisma.platformSettings.findUnique({ where: { id: 1 }, select: { defaultTrialDays: true } });
    const parsedTrialDays =
      trialDaysParam !== null && trialDaysParam !== undefined && trialDaysParam !== ""
        ? Number(trialDaysParam)
        : null;
    const eligibleForDefaultTrial = !subscription?.stripeSubscriptionId && (subscription?.plan ?? "FREE") === "FREE";
    const defaultTrialDays = settings?.defaultTrialDays ?? 14;
    const trialDaysFinal =
      parsedTrialDays !== null && Number.isFinite(parsedTrialDays) && parsedTrialDays >= 0
        ? Math.floor(parsedTrialDays)
        : eligibleForDefaultTrial
          ? defaultTrialDays
          : 0;
    const trialDaysInt = trialDaysFinal > 0 ? trialDaysFinal : null;
    const nowSec = Math.floor(Date.now() / 1000);
    const trialEndSec = trialDaysInt ? nowSec + trialDaysInt * 86400 : null;

    const subscriptionData = {
      metadata: { userId: session.user.id, plan },
      ...(trialEndSec
        ? { trial_end: trialEndSec, billing_cycle_anchor: trialEndSec, proration_behavior: "none" }
        : {}),
    } as any;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: session.user.id, plan },
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: subscriptionData,
      allow_promotion_codes: true,
    });

    return NextResponse.redirect(checkoutSession.url!);
  } catch (err) {
    console.error("[create-checkout]", err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.diamond-booking.com";
    return NextResponse.redirect(`${appUrl}/dashboard/billing?error=checkout_failed`);
  }
}
