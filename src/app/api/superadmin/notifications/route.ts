import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSuperAdmin();
    const items = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        targetName: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ success: true, data: items });
  } catch {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
}

