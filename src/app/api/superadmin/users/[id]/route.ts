// src/app/api/superadmin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpFromHeaders } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, name: true, slug: true } },
        subscription: true,
        accounts: { select: { provider: true } },
      },
    });

    if (!user) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const ip = getIpFromHeaders(req.headers);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isActive: body.isActive,
        name: body.name,
        role: body.role,
      },
    });

    const action = body.isActive === false ? "USER_DISABLED"
      : body.isActive === true ? "USER_ENABLED"
      : body.role ? "USER_ROLE_CHANGED"
      : "BUSINESS_UPDATED";

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: action as Parameters<typeof createAuditLog>[0]["action"],
      targetType: "User",
      targetId: id,
      targetName: existing.email,
      metadata: { changes: body, oldValues: { isActive: existing.isActive, role: existing.role } },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
