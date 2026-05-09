// src/app/api/business/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(500).optional(),
  phone: z.string().optional(),
  email: z
    .preprocess((v) => (v === "" ? undefined : v), z.string().email().optional()),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  timezone: z.string().optional(),
  primaryColor: z.string().optional(),
  welcomeMessage: z.string().max(300).optional(),
  advanceBookingDays: z.number().min(1).max(365).optional(),
  minimumNoticeHours: z.number().min(0).max(168).optional(),
  bufferMinutes: z.number().min(0).max(120).optional(),
  autoConfirm: z.boolean().optional(),
  cancellationPolicy: z.string().optional(),
}).strict();

export async function GET() {
  try {
    const session = await requireOwner();
    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.id },
      include: {
        businessHours: { orderBy: { dayOfWeek: "asc" } },
        _count: { select: { staff: true, services: true, bookings: true, customers: true } },
      },
    });
    return NextResponse.json({ success: true, data: business });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireOwner();
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    // Check slug uniqueness if being changed
    if (parsed.data.slug) {
      const existing = await prisma.business.findFirst({
        where: { slug: parsed.data.slug, ownerId: { not: session.user.id } },
      });
      if (existing) {
        return NextResponse.json({ success: false, error: "This URL slug is already taken" }, { status: 409 });
      }
    }

    const business = await prisma.business.update({
      where: { ownerId: session.user.id },
      data: parsed.data,
    });

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "BUSINESS_UPDATED",
      targetType: "Business",
      targetId: business.id,
      targetName: business.name,
    });

    return NextResponse.json({ success: true, data: business });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update business" }, { status: 500 });
  }
}
