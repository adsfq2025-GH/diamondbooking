import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireOwner();
    const sub = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: {
        plan: true,
        status: true,
        trialStart: true,
        trialEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });
    return NextResponse.json({ success: true, data: sub });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

