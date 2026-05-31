import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export async function POST() {
  try {
    const session = await requireOwner();
    if (!session.user.businessId) {
      return NextResponse.json({ success: false, error: "No business found" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { id: true, name: true, email: true, stripeConnectAccountId: true },
    });
    if (!business) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
    }

    const stripe = getStripe();

    const accountId =
      business.stripeConnectAccountId ??
      (
        await stripe.accounts.create({
          type: "express",
          country: "US",
          business_profile: { name: business.name },
          email: business.email ?? undefined,
          metadata: { businessId: business.id },
        })
      ).id;

    if (!business.stripeConnectAccountId) {
      await prisma.business.update({
        where: { id: business.id },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const acct = await stripe.accounts.retrieve(accountId);

    await prisma.business.update({
      where: { id: business.id },
      data: {
        stripeChargesEnabled: !!acct.charges_enabled,
        stripePayoutsEnabled: !!acct.payouts_enabled,
        stripeDetailsSubmitted: !!acct.details_submitted,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        accountId,
        chargesEnabled: !!acct.charges_enabled,
        payoutsEnabled: !!acct.payouts_enabled,
        detailsSubmitted: !!acct.details_submitted,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Something went wrong";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
