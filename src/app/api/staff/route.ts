// src/app/api/staff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAddStaff } from "@/lib/plan-limits";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
  availability: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: z.string(),
        closeTime: z.string(),
        isClosed: z.boolean(),
      })
    )
    .optional(),
});

export async function GET() {
  try {
    const session  = await requireOwner();
    const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const staff = await prisma.staff.findMany({
      where: { businessId: business.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        services:     { include: { service: { select: { id: true, name: true, color: true } } } },
        availability: true,
        _count:       { select: { bookings: true } },
      },
    });
    return NextResponse.json({ success: true, data: staff });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session  = await requireOwner();
    const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const limit = await canAddStaff(business.id);
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: limit.message }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { serviceIds, availability, email, ...data } = parsed.data;
    const normalizedServiceIds = serviceIds?.length ? Array.from(new Set(serviceIds)) : [];

    if (normalizedServiceIds.length) {
      const services = await prisma.service.findMany({
        where: { businessId: business.id, id: { in: normalizedServiceIds } },
        select: { id: true },
      });
      if (services.length !== normalizedServiceIds.length) {
        return NextResponse.json(
          { success: false, error: "Invalid service selection" },
          { status: 400 }
        );
      }
    }

    const member = await prisma.staff.create({
      data: {
        ...data,
        email:      email || null,
        businessId: business.id,
        ...(normalizedServiceIds.length
          ? { services: { create: normalizedServiceIds.map((sid) => ({ serviceId: sid })) } }
          : {}),
        ...(availability?.length
          ? { availability: { create: availability } }
          : {}),
      },
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (err) {
    console.error("[/api/staff POST]", err);
    return NextResponse.json({ success: false, error: "Failed to create staff member" }, { status: 500 });
  }
}
