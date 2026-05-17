// src/app/api/billing/create-portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export async function GET(req: NextRequest) {
  try {
    if (req.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const session      = await requireOwner();
    const subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
    const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.diamond-booking.com";

    if (!subscription?.stripeCustomerId) {
      return NextResponse.redirect(`${appUrl}/dashboard/billing`);
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer:   subscription.stripeCustomerId,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.redirect(portal.url);
  } catch (err) {
    console.error("[create-portal]", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/billing`);
  }
}
