// src/app/api/billing/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

type StripeSubscription = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

function buildStripePlanMap(): Record<string, string> {
  const entries: Array<[string | undefined, string]> = [
    [process.env.STRIPE_PRICE_STARTER, "STARTER"],
    [process.env.STRIPE_PRICE_STARTER_MONTHLY, "STARTER"],
    [process.env.STRIPE_PRICE_STARTER_YEARLY, "STARTER"],
    [process.env.STRIPE_PRICE_PRO, "PROFESSIONAL"],
    [process.env.STRIPE_PRICE_PRO_MONTHLY, "PROFESSIONAL"],
    [process.env.STRIPE_PRICE_PRO_YEARLY, "PROFESSIONAL"],
    [process.env.STRIPE_PRICE_ENTERPRISE, "ENTERPRISE"],
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY, "ENTERPRISE"],
    [process.env.STRIPE_PRICE_ENTERPRISE_YEARLY, "ENTERPRISE"],
  ];

  return Object.fromEntries(
    entries.flatMap(([priceId, plan]) => (priceId ? [[priceId, plan] as const] : []))
  );
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELLED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "paused":
      return "PAUSED";
    default:
      return null;
  }
}

async function getUserIdFromStripeCustomer(stripe: Stripe, customerId: string) {
  const customer = await stripe.customers.retrieve(customerId);
  if ("deleted" in customer && customer.deleted) return null;
  return customer.metadata?.userId ?? null;
}

function getStripeSubscriptionPlan(stripeSub: Stripe.Subscription, STRIPE_PLAN_MAP: Record<string, string>) {
  const priceId = stripeSub.items.data[0]?.price.id;
  return priceId ? STRIPE_PLAN_MAP[priceId] ?? null : null;
}

async function runIdempotentWebhookEvent<T>(
  event: Stripe.Event,
  work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T | null> {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        livemode: event.livemode,
        stripeCreated: new Date(event.created * 1000),
        payload: event as unknown as Prisma.InputJsonValue,
        processed: false,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta as { target?: string[] | string } | undefined)?.target;
      const isStripeEventId =
        (Array.isArray(target) && target.includes("stripeEventId")) ||
        target === "stripeEventId";
      if (isStripeEventId) return null;
    }
    throw err;
  }

  try {
    const result = await prisma.$transaction(async (tx) => work(tx));
    try {
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: { processed: true, processedAt: new Date(), errorMessage: null },
      });
    } catch (updateErr) {
      const msg = updateErr instanceof Error ? updateErr.message : "Failed to mark webhook event as processed";
      await prisma.stripeWebhookEvent
        .update({
          where: { stripeEventId: event.id },
          data: { processed: false, processedAt: new Date(), errorMessage: msg },
        })
        .catch(() => {});
      throw updateErr;
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook processing failed";
    await prisma.stripeWebhookEvent
      .update({
        where: { stripeEventId: event.id },
        data: { processed: false, processedAt: new Date(), errorMessage: msg },
      })
      .catch(() => {});
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");
  const STRIPE_PLAN_MAP = buildStripePlanMap();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    switch (event.type) {

      // ── Checkout completed → activate subscription ──────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId =
          session.metadata?.userId ??
          (await stripe.customers.retrieve(session.customer as string) as Stripe.Customer).metadata?.userId;

        if (!userId) { console.error("[webhook] No userId in checkout session"); break; }

        const stripeSub = await stripe.subscriptions.retrieve(
          session.subscription as string
        ) as unknown as StripeSubscription;
        const plan = getStripeSubscriptionPlan(stripeSub, STRIPE_PLAN_MAP) ?? "STARTER";
        const status = mapStripeSubscriptionStatus(stripeSub.status) ?? "ACTIVE";

        const subscription = await runIdempotentWebhookEvent(event, async (tx) => {
          return await tx.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeSubscriptionId: stripeSub.id,
              stripeCustomerId: session.customer as string,
              plan: plan as never,
              status: status as never,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
              trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
              cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
            },
            update: {
              stripeSubscriptionId: stripeSub.id,
              stripeCustomerId: session.customer as string,
              plan: plan as never,
              status: status as never,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
              trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
              cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
            },
          });
        });
        if (!subscription) return NextResponse.json({ received: true });

        await createAuditLog({
          userId,
          action: "SUBSCRIPTION_CREATED",
          targetType: "Subscription",
          targetId: subscription.id,
          metadata: { plan, stripeSubscriptionId: stripeSub.id },
        });
        break;
      }

      case "customer.subscription.created": {
        const stripeSub = event.data.object as StripeSubscription;
        const status = mapStripeSubscriptionStatus(stripeSub.status) ?? "ACTIVE";
        const plan = getStripeSubscriptionPlan(stripeSub, STRIPE_PLAN_MAP);
        const customerId = stripeSub.customer as string;
        const userId = await getUserIdFromStripeCustomer(stripe, customerId);

        await runIdempotentWebhookEvent(event, async (tx) => {
          if (!userId) return null;
          await tx.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: stripeSub.id,
              plan: (plan ?? "STARTER") as never,
              status: status as never,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
              trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
              cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: stripeSub.id,
              ...(plan ? { plan: plan as never } : {}),
              status: status as never,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
              trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
              cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
            },
          });
          return null;
        });
        break;
      }

      // ── Invoice paid/succeeded → renew period ──────────────────────────
      case "invoice.paid":
      case "invoice.payment_succeeded": {
         const invoice = event.data.object as Stripe.Invoice;
         const subId =
           invoice.parent?.type === "subscription_details"
             ? (invoice.parent.subscription_details?.subscription as string)
             : null;
         if (!subId) break;

        const stripeSub = await stripe.subscriptions.retrieve(
          subId
        ) as unknown as StripeSubscription;
        const status = mapStripeSubscriptionStatus(stripeSub.status) ?? "ACTIVE";
        const plan = getStripeSubscriptionPlan(stripeSub, STRIPE_PLAN_MAP);
        const customerId = stripeSub.customer as string;
        const userId = await getUserIdFromStripeCustomer(stripe, customerId);

        const result = await runIdempotentWebhookEvent(event, async (tx) => {
          let sub = await tx.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
          if (!sub) {
            if (!userId) return null;
            sub = await tx.subscription.upsert({
              where: { userId },
              create: {
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: stripeSub.id,
                plan: (plan ?? "STARTER") as never,
                status: status as never,
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
                trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
                cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
              },
              update: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: stripeSub.id,
                ...(plan ? { plan: plan as never } : {}),
                status: status as never,
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
                trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
                cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
              },
            });
          } else {
            await tx.subscription.update({
              where: { id: sub.id },
              data: {
                ...(plan ? { plan: plan as never } : {}),
                status: status as never,
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
                trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
                cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
              },
            });
          }
          return sub;
        });
        if (!result) return NextResponse.json({ received: true });
        const sub = result;

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
        const subId =
          invoice.parent?.type === "subscription_details"
            ? (invoice.parent.subscription_details?.subscription as string)
            : null;
        if (!subId) break;

        const stripeSub = await stripe.subscriptions.retrieve(
          subId
        ) as unknown as StripeSubscription;                                     
        const status = mapStripeSubscriptionStatus(stripeSub.status) ?? "PAST_DUE";
        const plan = getStripeSubscriptionPlan(stripeSub, STRIPE_PLAN_MAP);
        const customerId = stripeSub.customer as string;
        const userId = await getUserIdFromStripeCustomer(stripe, customerId);

        const result = await runIdempotentWebhookEvent(event, async (tx) => {
          let sub = await tx.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
          if (!sub) {
            if (!userId) return null;
            sub = await tx.subscription.upsert({
              where: { userId },
              create: {
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: stripeSub.id,
                plan: (plan ?? "STARTER") as never,
                status: status as never,
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
                trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
                cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
              },
              update: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: stripeSub.id,
                ...(plan ? { plan: plan as never } : {}),
                status: status as never,
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
                trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
                cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
              },
            });
          } else {
            await tx.subscription.update({
              where: { id: sub.id },
              data: {
                ...(plan ? { plan: plan as never } : {}),
                status: status as never,
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
                trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
                cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
              },
            });
          }
          return sub;
        });
        if (!result) return NextResponse.json({ received: true });
        const sub = result;

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
        const stripeSub = event.data.object as StripeSubscription;
        const status = mapStripeSubscriptionStatus(stripeSub.status);
        const plan = getStripeSubscriptionPlan(stripeSub, STRIPE_PLAN_MAP);
        const customerId = stripeSub.customer as string;
        const userId = await getUserIdFromStripeCustomer(stripe, customerId);

        const result = await runIdempotentWebhookEvent(event, async (tx) => {
          let sub = await tx.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
          if (!sub) {
            if (!userId) return null;
            sub = await tx.subscription.upsert({
              where: { userId },
              create: {
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: stripeSub.id,
                plan: (plan ?? "STARTER") as never,
                status: (status ?? "ACTIVE") as never,
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
                trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
                cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
              },
              update: {
                stripeCustomerId: customerId,
                ...(plan ? { plan: plan as never } : {}),
                ...(status ? { status: status as never } : {}),
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
                trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
                cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
              },
            });
          }

          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              ...(plan ? { plan: plan as never } : {}),
              ...(status ? { status: status as never } : {}),
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
            },
          });
          return sub;
        });
        if (!result) return NextResponse.json({ received: true });
        const sub = result;

        await createAuditLog({
          action: "SUBSCRIPTION_PLAN_CHANGED",
          targetType: "Subscription",
          targetId: sub.id,
          metadata: { plan: plan ?? sub.plan, status: stripeSub.status },
        });
        break;
      }

      // ── Subscription deleted (hard cancel) ─────────────────────────────
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as StripeSubscription;
        const customerId = stripeSub.customer as string;
        const userId = await getUserIdFromStripeCustomer(stripe, customerId);
        const result = await runIdempotentWebhookEvent(event, async (tx) => {
          let sub = await tx.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
          if (!sub) {
            if (!userId) return null;
            sub = await tx.subscription.upsert({
              where: { userId },
              create: {
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: stripeSub.id,
                plan: "FREE",
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                currentPeriodStart: stripeSub.current_period_start
                  ? new Date(stripeSub.current_period_start * 1000)
                  : null,
                currentPeriodEnd: stripeSub.current_period_end
                  ? new Date(stripeSub.current_period_end * 1000)
                  : null,
                trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
                trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
              },
              update: {},
            });
          }

          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(),
              plan: "FREE",
            },
          });
          return sub;
        });
        if (!result) return NextResponse.json({ received: true });
        const sub = result;

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
