// src/app/api/superadmin/businesses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 25));
    const search = searchParams.get("search") ?? "";
    const plan = searchParams.get("plan") ?? "";
    const status = searchParams.get("status") ?? "";
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

    const where = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { city: { contains: search, mode: "insensitive" as const } },
                { owner: { email: { contains: search, mode: "insensitive" as const } } },
              ],
            }
          : {},
        plan ? { owner: { subscription: { plan: plan as never } } } : {},
        status === "active"
          ? { isActive: true }
          : status === "suspended"
          ? { isActive: false }
          : {},
      ],
    };

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              subscription: { select: { plan: true, status: true } },
            },
          },
          _count: {
            select: { bookings: true, customers: true, staff: true, services: true },
          },
        },
      }),
      prisma.business.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: businesses,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error("[/api/superadmin/businesses GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load businesses" }, { status: 500 });
  }
}
