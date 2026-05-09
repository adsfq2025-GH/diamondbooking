// src/app/api/staff/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    bio: z.string().max(1000).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireOwner();
    const { id }  = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true },
    });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const result = await prisma.staff.updateMany({
      where: { id, businessId: business.id },
      data: parsed.data,
    });
    if (result.count === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const updated = await prisma.staff.findUnique({ where: { id } });
    return NextResponse.json({ success: true, data: updated });
  } catch { return NextResponse.json({ success: false, error: "Failed" }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireOwner();
    const { id }  = await params;
    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true },
    });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const result = await prisma.staff.updateMany({
      where: { id, businessId: business.id },
      data: { isActive: false },
    });
    if (result.count === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: "Failed" }, { status: 500 }); }
}
