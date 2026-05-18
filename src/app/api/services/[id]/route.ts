// src/app/api/services/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    duration: z.number().int().min(5).max(480).optional(),
    price: z.number().min(0).optional(),
    currency: z.string().min(3).max(3).optional(),
    color: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
    staffIds: z.array(z.string()).optional(),
  })
  .strict();

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true },
    });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const { staffIds, ...serviceData } = parsed.data;
    const normalizedStaffIds = staffIds ? Array.from(new Set(staffIds)) : undefined;

    if (normalizedStaffIds) {
      const staff = await prisma.staff.findMany({
        where: { businessId: business.id, id: { in: normalizedStaffIds } },
        select: { id: true },
      });
      if (staff.length !== normalizedStaffIds.length) {
        return NextResponse.json({ success: false, error: "Invalid staff selection" }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.service.updateMany({
        where: { id, businessId: business.id },
        data: serviceData,
      });
      if (result.count === 0) return null;

      if (normalizedStaffIds) {
        await tx.staffService.deleteMany({ where: { serviceId: id } });
        if (normalizedStaffIds.length) {
          await tx.staffService.createMany({
            data: normalizedStaffIds.map((staffId) => ({ staffId, serviceId: id })),
          });
        }
      }

      return await tx.service.findUnique({
        where: { id },
        include: { staff: { include: { staff: { select: { id: true, name: true } } } } },
      });
    });

    if (!updated) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true },
    });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const result = await prisma.service.updateMany({
      where: { id, businessId: business.id },
      data: { isActive: false },
    });
    if (result.count === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
