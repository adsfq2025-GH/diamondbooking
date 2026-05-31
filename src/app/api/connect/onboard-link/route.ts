import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwner();
    if (!session.user.businessId) {
      return NextResponse.json({ success: false, error: "No business found" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { id: true, stripeConnectAccountId: true },
    });
    if (!business?.stripeConnectAccountId) {
      return NextResponse.json({ success: false, error: "Stripe account not created" }, { status: 400 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.diamond-booking.com").replace(/\/+$/, "");
    const stripe = getStripe();

    // Allow callers to specify a custom return destination (e.g., back to onboarding)
    let returnPath = "/dashboard/billing?connect=return";
    let refreshPath = "/dashboard/billing?connect=refresh";
    try {
      const body = await req.json() as { returnTo?: string; refreshTo?: string };
      if (body.returnTo && typeof body.returnTo === "string") returnPath = body.returnTo;
      if (body.refreshTo && typeof body.refreshTo === "string") refreshPath = body.refreshTo;
    } catch {
      // No body or invalid JSON — use defaults
    }

    const link = await stripe.accountLinks.create({
      account: business.stripeConnectAccountId,
      type: "account_onboarding",
      refresh_url: `${appUrl}${refreshPath.startsWith("/") ? refreshPath : `/${refreshPath}`}`,
      return_url: `${appUrl}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`,
    });

    return NextResponse.json({ success: true, data: { url: link.url } });
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
