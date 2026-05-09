// src/app/api/public/business/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true, name: true, slug: true, description: true,
      logoUrl: true, coverImageUrl: true, primaryColor: true, welcomeMessage: true,
      phone: true, email: true, address: true, city: true, state: true,
      timezone: true, currency: true, advanceBookingDays: true,
      minimumNoticeHours: true, autoConfirm: true, cancellationPolicy: true,
      businessHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!business) {
    return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: business });
}
