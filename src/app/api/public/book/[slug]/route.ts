// src/app/api/public/book/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAcceptBooking } from "@/lib/plan-limits";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const schema = z.object({
  serviceId:     z.string(),
  staffId:       z.string(),
  date:          z.string(), // YYYY-MM-DD
  startTime:     z.string(), // ISO UTC datetime
  endTime:       z.string(), // ISO UTC datetime
  customerName:  z.string().min(1).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  notes:         z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    include: { owner: { select: { subscription: { select: { plan: true, status: true } } } } },
  });
  if (!business) {
    return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
  }

  // Check subscription active
  const subStatus = business.owner.subscription?.status;
  if (subStatus && !["ACTIVE", "TRIALING"].includes(subStatus)) {
    return NextResponse.json(
      { success: false, error: "This business is not currently accepting bookings" },
      { status: 403 }
    );
  }

  // Check booking limit
  const limitCheck = await canAcceptBooking(business.id);
  if (!limitCheck.allowed) {
    return NextResponse.json({ success: false, error: "This business has reached its monthly booking limit" }, { status: 429 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const { serviceId, staffId, date, startTime, endTime, customerName, customerEmail, customerPhone, notes } = parsed.data;

  // Verify service belongs to this business
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id, isActive: true },
  });
  if (!service) return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });

  // Verify staff belongs to this business and can perform service
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, businessId: business.id, isActive: true, services: { some: { serviceId } } },
  });
  if (!staff) return NextResponse.json({ success: false, error: "Staff member not available" }, { status: 404 });

  // Verify slot is still available (double-check against DB)
  const slotStart = new Date(startTime);
  const slotEnd   = new Date(endTime);

  const conflict = await prisma.booking.findFirst({
    where: {
      staffId,
      status: { in: ["CONFIRMED", "PENDING"] },
      OR: [
        { startTime: { lt: slotEnd },   endTime: { gt: slotStart } },
      ],
    },
  });
  if (conflict) {
    return NextResponse.json({ success: false, error: "This time slot is no longer available" }, { status: 409 });
  }

  // Upsert customer (unique per business+email)
  const customer = await prisma.customer.upsert({
    where: { businessId_email: { businessId: business.id, email: customerEmail.toLowerCase() } },
    update: { name: customerName, phone: customerPhone ?? undefined },
    create: {
      businessId: business.id,
      name: customerName,
      email: customerEmail.toLowerCase(),
      phone: customerPhone ?? null,
    },
  });

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      businessId: business.id,
      serviceId,
      staffId,
      customerId: customer.id,
      date: new Date(date),
      startTime: slotStart,
      endTime:   slotEnd,
      status: business.autoConfirm ? "CONFIRMED" : "PENDING",
      notes: notes ?? null,
      totalPrice: service.price,
      source: "booking_page",
    },
    include: {
      service: { select: { name: true, duration: true } },
      staff:   { select: { name: true } },
    },
  });

  await createAuditLog({
    action: "BOOKING_CREATED",
    targetType: "Booking",
    targetId: booking.id,
    targetName: `${customerName} — ${service.name}`,
    metadata: { businessId: business.id, source: "booking_page" },
  });

  // TODO: Send confirmation emails via Resend
  // await sendBookingConfirmation({ booking, customer, business });

  return NextResponse.json({
    success: true,
    data: {
      bookingId:   booking.id,
      status:      booking.status,
      serviceName: booking.service.name,
      staffName:   booking.staff.name,
      startTime:   booking.startTime,
      endTime:     booking.endTime,
      customerName,
      customerEmail,
    },
  }, { status: 201 });
}
