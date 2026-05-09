// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAcceptBooking } from "@/lib/plan-limits";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const createSchema = z.object({
  serviceId: z.string(),
  staffId: z.string(),
  customerId: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(), // ISO datetime string
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireOwner();
    const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const bookings = await prisma.booking.findMany({
      where: {
        businessId: business.id,
        ...(status ? { status: status as never } : {}),
        ...(dateFrom || dateTo ? {
          startTime: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        } : {}),
      },
      orderBy: { startTime: "asc" },
      include: {
        customer: true,
        service: { select: { name: true, color: true, duration: true } },
        staff: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, data: bookings });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwner();
    const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const limit = await canAcceptBooking(business.id);
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: limit.message }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { serviceId, staffId, customerName, customerEmail, customerPhone, date, startTime, notes } = parsed.data;

    const service = await prisma.service.findFirst({ where: { id: serviceId, businessId: business.id } });
    if (!service) return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.duration * 60 * 1000);

    // Upsert customer
    const customer = await prisma.customer.upsert({
      where: { businessId_email: { businessId: business.id, email: customerEmail } },
      update: { name: customerName, phone: customerPhone },
      create: { businessId: business.id, name: customerName, email: customerEmail, phone: customerPhone },
    });

    const booking = await prisma.booking.create({
      data: {
        businessId: business.id,
        serviceId,
        staffId,
        customerId: customer.id,
        date: new Date(date),
        startTime: start,
        endTime: end,
        status: business.autoConfirm ? "CONFIRMED" : "PENDING",
        notes,
        totalPrice: service.price,
        source: "manual",
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "BOOKING_CREATED",
      targetType: "Booking",
      targetId: booking.id,
      targetName: `${customerName} — ${service.name}`,
    });

    return NextResponse.json({ success: true, data: booking }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create booking" }, { status: 500 });
  }
}
