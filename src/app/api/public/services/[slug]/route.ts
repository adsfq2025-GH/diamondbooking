// src/app/api/public/services/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: { id: true, owner: { select: { subscription: { select: { plan: true } } } } },
  });
  if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const services = await prisma.service.findMany({
    where: { businessId: business.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, name: true, description: true,
      duration: true, price: true, currency: true, color: true,
      staff: {
        where: { staff: { isActive: true } },
        select: { staff: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  return NextResponse.json({ success: true, data: services });
}
