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
  const session = await requireOwner();
  if (!session.user.businessId) {
    return NextResponse.json({ success: false, error: "No business found" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
    select: { stripeConnectAccountId: true },
  });
  if (!business?.stripeConnectAccountId) {
    return NextResponse.json({ success: false, error: "Stripe account not connected" }, { status: 400 });
  }

  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(business.stripeConnectAccountId);

  return NextResponse.json({ success: true, data: { url: link.url } });
}

