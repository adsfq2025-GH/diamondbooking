// src/app/api/business/onboard/complete/route.ts
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOwnerBusinessId } from "@/lib/owner-business";

export async function POST() {
  try {
    const session = await requireOwner();
    const businessId = await resolveOwnerBusinessId(session.user.id, session.user.businessId);
    if (!businessId) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        onboardingComplete: true,
        name: true,
        businessHours: { select: { id: true } },
        staff: { select: { id: true, isActive: true } },
        services: { select: { id: true, isActive: true } },
      },
    });

    if (!business) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
    }

    if (business.onboardingComplete) {
      return NextResponse.json({ success: true, data: { businessId: business.id, onboardingComplete: true } });
    }

    const missing: string[] = [];
    if (!business.name.trim()) missing.push("business name");
    if (business.businessHours.length === 0) missing.push("business hours");
    if (business.staff.filter((member) => member.isActive).length === 0) missing.push("at least one active team member");
    if (business.services.filter((service) => service.isActive).length === 0) missing.push("at least one active service");

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Finish setup before launching: add ${missing.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    await prisma.business.update({
      where: { id: business.id },
      data: { onboardingComplete: true },
    });
    return NextResponse.json({ success: true, data: { businessId: business.id, onboardingComplete: true } });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
