// src/lib/availability.ts
// Core scheduling logic — generates available time slots for a given date/service/staff

import { prisma } from "@/lib/prisma";
import { parseISO, format, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export interface SlotResult {
  startTime: string;   // "HH:mm" local time
  endTime: string;
  startUTC: string;    // ISO string for storage
  endUTC: string;
  staffId: string;
  staffName: string;
  available: boolean;
}

export interface AvailabilityParams {
  businessSlug: string;
  serviceId: string;
  staffId: string | "any";
  date: string; // "YYYY-MM-DD" in business local time
}

/**
 * Convert "HH:mm" time string + a Date (for the day) + timezone → UTC Date
 */
function localTimeToUTC(timeStr: string, dateInTz: Date, timezone: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const localDate = new Date(dateInTz);
  localDate.setHours(hours, minutes, 0, 0);
  // Convert from business timezone to UTC
  return fromZonedTime(localDate, timezone);
}

/**
 * Check if two time ranges overlap (with optional buffer)
 */
function overlaps(
  startA: Date, endA: Date,
  startB: Date, endB: Date,
  bufferMinutes = 0
): boolean {
  const bufferedStart = new Date(startB.getTime() - bufferMinutes * 60_000);
  const bufferedEnd   = new Date(endB.getTime()   + bufferMinutes * 60_000);
  return startA < bufferedEnd && endA > bufferedStart;
}

export async function getAvailableSlots(params: AvailabilityParams): Promise<SlotResult[]> {
  const { businessSlug, serviceId, staffId, date } = params;

  // ── Load business ──────────────────────────────────────────────────────────
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug, isActive: true },
    include: { businessHours: true },
  });
  if (!business) return [];

  // ── Load service ───────────────────────────────────────────────────────────
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id, isActive: true },
  });
  if (!service) return [];

  // ── Parse the requested date in business timezone ──────────────────────────
  const tz = business.timezone;
  const requestedDate = parseISO(date); // treat as local date
  const dayOfWeek = requestedDate.getDay();

  // ── Determine which staff to check ────────────────────────────────────────
  const staffList =
    staffId === "any"
      ? await prisma.staff.findMany({
          where: {
            businessId: business.id,
            isActive: true,
            services: { some: { serviceId } },
          },
          include: { availability: true },
        })
      : await prisma.staff.findMany({
          where: {
            id: staffId,
            businessId: business.id,
            isActive: true,
            services: { some: { serviceId } },
          },
          include: { availability: true },
        });

  if (staffList.length === 0) return [];

  // ── Time window constraints ────────────────────────────────────────────────
  const now = new Date();
  const minBookingTime = new Date(now.getTime() + business.minimumNoticeHours * 60 * 60 * 1000);
  const maxDate = addMinutes(now, business.advanceBookingDays * 24 * 60);

  // Can't book in the past or beyond advance window
  if (isAfter(requestedDate, maxDate)) return [];

  const slots: SlotResult[] = [];

  for (const staffMember of staffList) {
    // ── Get this staff member's hours for the day ──────────────────────────
    const staffAvail = staffMember.availability.find((a) => a.dayOfWeek === dayOfWeek);
    const bizHours   = business.businessHours.find((h) => h.dayOfWeek === dayOfWeek);

    // Use staff override if set, otherwise fall back to business hours
    const dayHours = staffAvail ?? bizHours;
    if (!dayHours || dayHours.isClosed) continue;

    const windowStart = localTimeToUTC(dayHours.openTime, requestedDate, tz);
    const windowEnd   = localTimeToUTC(dayHours.closeTime, requestedDate, tz);

    // ── Load existing bookings for this staff on this date ─────────────────
    const existingBookings = await prisma.booking.findMany({
      where: {
        staffId: staffMember.id,
        date: { equals: startOfDay(requestedDate) },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      select: { startTime: true, endTime: true },
    });

    // ── Generate slots in INCREMENT-minute steps ───────────────────────────
    const increment = business.slotIncrementMinutes;
    const duration  = service.duration;
    const buffer    = business.bufferMinutes;

    let cursor = new Date(windowStart);

    while (isBefore(cursor, windowEnd)) {
      const slotEnd = addMinutes(cursor, duration);

      // Slot must end within the working window
      if (isAfter(slotEnd, windowEnd)) break;

      // Must be after the minimum notice window
      const available =
        isAfter(cursor, minBookingTime) &&
        !existingBookings.some((b) =>
          overlaps(cursor, slotEnd, new Date(b.startTime), new Date(b.endTime), buffer)
        );

      if (available) {
        const localStart = toZonedTime(cursor, tz);
        const localEnd   = toZonedTime(slotEnd, tz);

        slots.push({
          startTime: format(localStart, "HH:mm"),
          endTime:   format(localEnd,   "HH:mm"),
          startUTC:  cursor.toISOString(),
          endUTC:    slotEnd.toISOString(),
          staffId:   staffMember.id,
          staffName: staffMember.name,
          available: true,
        });
      }

      cursor = addMinutes(cursor, increment);
    }
  }

  // Deduplicate and sort by time
  const seen = new Set<string>();
  return slots
    .filter((s) => {
      const key = `${s.startTime}-${s.staffId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
