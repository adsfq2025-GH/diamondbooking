// src/app/api/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAddService } from "@/lib/plan-limits";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  duration: z.number().int().min(5).max(480),
  price: z.number().min(0),
  billingUnit: z.enum(["PER_JOB", "PER_HOUR"]).optional(),
  minDurationMinutes: z.number().int().min(5).max(480).optional(),
  color: z.string().optional(),
  staffIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await requireOwner();
    const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const services = await prisma.service.findMany({
      where: { businessId: business.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { staff: { include: { staff: { select: { id: true, name: true } } } } },
    });
    return NextResponse.json({ success: true, data: services });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwner();
    const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Check plan limits
    const limit = await canAddService(business.id);
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: limit.message }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { staffIds, ...data } = parsed.data;
    const normalizedStaffIds = staffIds?.length ? Array.from(new Set(staffIds)) : [];

    if (normalizedStaffIds.length) {
      const staff = await prisma.staff.findMany({
        where: { businessId: business.id, id: { in: normalizedStaffIds } },
        select: { id: true },
      });
      if (staff.length !== normalizedStaffIds.length) {
        return NextResponse.json(
          { success: false, error: "Invalid staff selection" },
          { status: 400 }
        );
      }
    }

    const service = await prisma.service.create({
      data: {
        ...data,
        businessId: business.id,
        price: data.price,
        ...(normalizedStaffIds.length
          ? { staff: { create: normalizedStaffIds.map((staffId) => ({ staffId })) } }
          : {}),
      },
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create service" }, { status: 500 });
  }
}
