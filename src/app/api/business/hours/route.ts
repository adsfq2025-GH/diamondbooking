// src/app/api/business/hours/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  try {
    const session = await requireOwner();
    const { hours } = await req.json();

    const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
    if (!business) return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });

    // Upsert each day's hours
    await Promise.all(
      hours.map((h: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }) =>
        prisma.businessHours.upsert({
          where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: h.dayOfWeek } },
          update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
          create: { businessId: business.id, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to save hours" }, { status: 500 });
  }
}
