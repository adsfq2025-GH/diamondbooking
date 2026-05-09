// src/app/api/superadmin/businesses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpFromHeaders } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true, name: true, email: true, createdAt: true,
            lastLoginAt: true, isActive: true, emailVerified: true,
            subscription: true,
          },
        },
        businessHours: true,
        staff: { include: { services: { include: { service: true } } } },
        services: true,
        _count: { select: { bookings: true, customers: true } },
        bookings: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            service: { select: { name: true } },
            customer: { select: { name: true, email: true } },
            staff: { select: { name: true } },
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: business });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load business" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const ip = getIpFromHeaders(req.headers);

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
    }

    const updated = await prisma.business.update({
      where: { id },
      data: {
        name: body.name,
        adminNotes: body.adminNotes,
        isActive: body.isActive,
        isFeatured: body.isFeatured,
      },
    });

    // Log suspension / reactivation
    if (body.isActive !== undefined && body.isActive !== existing.isActive) {
      await createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email,
        action: body.isActive ? "BUSINESS_REACTIVATED" : "BUSINESS_SUSPENDED",
        targetType: "Business",
        targetId: id,
        targetName: existing.name,
        metadata: { isActive: body.isActive },
        ipAddress: ip,
      });
    } else {
      await createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email,
        action: "BUSINESS_UPDATED",
        targetType: "Business",
        targetId: id,
        targetName: existing.name,
        metadata: { changes: body },
        ipAddress: ip,
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update business" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const ip = getIpFromHeaders(req.headers);

    const business = await prisma.business.findUnique({
      where: { id },
      include: { owner: { select: { email: true } } },
    });
    if (!business) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
    }

    // Soft delete — deactivate business and cancel subscription
    await prisma.$transaction([
      prisma.business.update({ where: { id }, data: { isActive: false } }),
      prisma.subscription.update({
        where: { userId: business.ownerId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      }),
    ]);

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "BUSINESS_DELETED",
      targetType: "Business",
      targetId: id,
      targetName: business.name,
      metadata: { ownerEmail: business.owner.email },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete business" }, { status: 500 });
  }
}
