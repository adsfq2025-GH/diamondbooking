// src/app/api/billing/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

function buildStripePlanMap(): Record<string, string> {
  const entries: Array<[string | undefined, string]> = [
    [process.env.STRIPE_PRICE_STARTER_MONTHLY, "STARTER"],
    [process.env.STRIPE_PRICE_STARTER_YEARLY, "STARTER"],
    [process.env.STRIPE_PRICE_PRO_MONTHLY, "PROFESSIONAL"],
    [process.env.STRIPE_PRICE_PRO_YEARLY, "PROFESSIONAL"],
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY, "ENTERPRISE"],
    [process.env.STRIPE_PRICE_ENTERPRISE_YEARLY, "ENTERPRISE"],
  ];

  return Object.fromEntries(entries.filter(([k]) => !!k) as Array<[string, string]>);
}

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");
  const STRIPE_PLAN_MAP = buildStripePlanMap();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {

      // ── Checkout completed → activate subscription ──────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId =
          session.metadata?.userId ??
          (await stripe.customers.retrieve(session.customer as string) as Stripe.Customer).metadata?.userId;

        if (!userId) { console.error("[webhook] No userId in checkout session"); break; }

        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId   = stripeSub.items.data[0]?.price.id;
        const plan      = STRIPE_PLAN_MAP[priceId] ?? "STARTER";

        await prisma.subscription.update({
          where: { userId },
          data: {
            stripeSubscriptionId: stripeSub.id,
            stripeCustomerId:     session.customer as string,
            plan:                 plan as never,
            status:               "ACTIVE",
            currentPeriodStart:   new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd:     new Date(stripeSub.current_period_end   * 1000),
            cancelAtPeriodEnd:    stripeSub.cancel_at_period_end,
          },
        });

        await createAuditLog({
          action: "SUBSCRIPTION_CREATED",
          targetType: "Subscription",
          targetId: userId,
          metadata: { plan, stripeSubscriptionId: stripeSub.id },
        });
        break;
      }

      // ── Invoice paid → renew period ────────────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId   = invoice.subscription as string;
        if (!subId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const sub       = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
        if (!sub) break;

        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status:             "ACTIVE",
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
            cancelAtPeriodEnd:  stripeSub.cancel_at_period_end,
          },
        });

        await createAuditLog({
          action: "PAYMENT_SUCCEEDED",
          targetType: "Subscription",
          targetId: sub.id,
          metadata: { amount: invoice.amount_paid, currency: invoice.currency },
        });
        break;
      }

      // ── Invoice payment failed → mark past_due ─────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId   = invoice.subscription as string;
        if (!subId) break;

        const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
        if (!sub) break;

        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "PAST_DUE" },
        });

        await createAuditLog({
          action: "PAYMENT_FAILED",
          targetType: "Subscription",
          targetId: sub.id,
          metadata: { amount: invoice.amount_due, attemptCount: invoice.attempt_count },
        });
        break;
      }

      // ── Subscription updated (plan change, cancel, etc.) ──────────────
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const sub       = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
        if (!sub) break;

        const priceId = stripeSub.items.data[0]?.price.id;
        const plan    = STRIPE_PLAN_MAP[priceId] ?? sub.plan;

        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            plan:               plan as never,
            status:             stripeSub.status.toUpperCase() as never,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
            cancelAtPeriodEnd:  stripeSub.cancel_at_period_end,
            cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
          },
        });

        await createAuditLog({
          action: "SUBSCRIPTION_PLAN_CHANGED",
          targetType: "Subscription",
          targetId: sub.id,
          metadata: { plan, status: stripeSub.status },
        });
        break;
      }

      // ── Subscription deleted (hard cancel) ─────────────────────────────
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const sub       = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
        if (!sub) break;

        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status:      "CANCELLED",
            cancelledAt: new Date(),
            plan:        "FREE",
          },
        });

        await createAuditLog({
          action: "SUBSCRIPTION_CANCELLED",
          targetType: "Subscription",
          targetId: sub.id,
          metadata: { reason: "stripe_deleted" },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
