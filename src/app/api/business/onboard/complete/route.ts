// src/app/api/business/onboard/complete/route.ts
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await requireOwner();
    await prisma.business.update({
      where: { ownerId: session.user.id },
      data: { onboardingComplete: true },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
