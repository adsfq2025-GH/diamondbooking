import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json({ success: true, data: { businesses: [], users: [] } });

    const [businesses, users] = await Promise.all([
      prisma.business.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: q.toLowerCase(), mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, email: true, name: true, role: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    return NextResponse.json({ success: true, data: { businesses, users } });
  } catch {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
}

