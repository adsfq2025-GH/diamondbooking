// src/app/api/bookings/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { cancelScheduledNotifications, scheduleCancellationNotifications, scheduleFollowUpNotifications } from "@/lib/automations/scheduler";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const { status } = await req.json();

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, business: { ownerId: session.user.id } },
      include: { customer: { select: { name: true } }, service: { select: { name: true } } },
    });

    if (!booking) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
    });

    await createAuditLog({
      userId: session.user.id,
      action: `BOOKING_${status}` as Parameters<typeof createAuditLog>[0]["action"],
      targetType: "Booking",
      targetId: id,
      targetName: `${booking.customer.name} — ${booking.service.name}`,
      metadata: { oldStatus: booking.status, newStatus: status },
    });

    if (status === "CANCELLED") {
      await cancelScheduledNotifications({ bookingId: id });
      await scheduleCancellationNotifications({ bookingId: id });
    }
    if (status === "COMPLETED") {
      await scheduleFollowUpNotifications({ bookingId: id });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}
