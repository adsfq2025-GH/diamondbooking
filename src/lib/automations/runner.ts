import { prisma } from "@/lib/prisma";
import { sendBookingReminder, sendCancellationEmail, sendFollowUpEmail, sendBookingConfirmation } from "@/lib/email";
import { buildBookingSms, sendSms } from "@/lib/sms";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");

export async function processDueNotifications(args: { limit: number; lockMinutes: number; maxAttempts: number }) {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() - args.lockMinutes * 60 * 1000);

  const due = await prisma.scheduledNotification.findMany({
    where: {
      status: { in: ["PENDING", "PROCESSING"] },
      scheduledAt: { lte: now },
      OR: [{ lockedAt: null }, { lockedAt: { lt: lockExpiry } }],
      attempts: { lt: args.maxAttempts },
    },
    orderBy: [{ scheduledAt: "asc" }],
    take: args.limit,
    select: { id: true },
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const row of due) {
    const claimed = await prisma.scheduledNotification.updateMany({
      where: {
        id: row.id,
        status: { in: ["PENDING", "PROCESSING"] },
        OR: [{ lockedAt: null }, { lockedAt: { lt: lockExpiry } }],
      },
      data: { status: "PROCESSING", lockedAt: now, attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) continue;

    processed += 1;

    try {
      const dispatchResult = await sendNotification(row.id);
      sent += 1;
      const finalize = await prisma.scheduledNotification.updateMany({
        where: { id: row.id, status: "PROCESSING" },
        data: {
          status: "SENT",
          sentAt: new Date(),
          lockedAt: null,
          lastError: null,
          ...(dispatchResult.providerId ? { providerId: dispatchResult.providerId } : {}),
        },
      });
      if (finalize.count !== 1) {
        console.warn(`[automations] Notification ${row.id} was sent but could not be finalized`);
      }
    } catch (e: unknown) {
      failed += 1;
      const msg = e instanceof Error ? e.message : "Failed";
      const current = await prisma.scheduledNotification.findUnique({
        where: { id: row.id },
        select: { attempts: true, status: true },
      });
      if (current?.status === "CANCELLED") {
        continue;
      }
      const giveUp = (current?.attempts ?? 0) >= args.maxAttempts;
      await prisma.scheduledNotification.updateMany({
        where: { id: row.id, status: "PROCESSING" },
        data: {
          status: giveUp ? "FAILED" : "PENDING",
          lockedAt: null,
          lastError: msg.slice(0, 500),
        },
      });
    }
  }

  return { processed, sent, failed };
}

async function sendNotification(id: string): Promise<{ providerId?: string | null }> {
  const n = await prisma.scheduledNotification.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      channel: true,
      type: true,
      toEmail: true,
      toPhone: true,
      providerId: true,
      booking: {
        select: {
          id: true,
          startTime: true,
          notes: true,
          business: { select: { name: true, timezone: true, slug: true, owner: { select: { email: true } } } },
          customer: { select: { name: true, email: true, phone: true } },
          service: { select: { name: true } },
          staff: { select: { name: true } },
        },
      },
    },
  });

  if (!n) throw new Error("Scheduled notification not found");
  if (n.status !== "PROCESSING") throw new Error("Notification is no longer active");
  if (n.channel === "EMAIL" && !n.toEmail) throw new Error("Missing recipient email");
  if (n.channel === "SMS" && !n.toPhone) throw new Error("Missing recipient phone");

  const bookingUrl = APP_URL ? `${APP_URL}/book/${n.booking.business.slug}` : undefined;
  const strictEmailOptions = { throwOnError: true } as const;

  if (n.channel === "EMAIL") {
    const data = {
      customerName: n.booking.customer.name,
      customerEmail: n.toEmail ?? n.booking.customer.email,
      businessName: n.booking.business.name,
      serviceName: n.booking.service.name,
      staffName: n.booking.staff.name,
      startTime: n.booking.startTime,
      timezone: n.booking.business.timezone,
      bookingId: n.booking.id,
      notes: n.booking.notes ?? undefined,
    };

    if (n.type === "BOOKING_REMINDER") {
      await sendBookingReminder(data, strictEmailOptions);
      return {};
    }
    if (n.type === "BOOKING_CANCELLATION") {
      await sendCancellationEmail(data, strictEmailOptions);
      return {};
    }
    if (n.type === "BOOKING_FOLLOW_UP") {
      await sendFollowUpEmail(data, strictEmailOptions);
      return {};
    }
    if (n.type === "BOOKING_CONFIRMATION") {
      await sendBookingConfirmation(data, strictEmailOptions);
      return {};
    }
    throw new Error(`Unsupported notification type: ${n.type}`);
  }

  if (n.channel === "SMS") {
    const body = buildBookingSms({
      type: n.type,
      businessName: n.booking.business.name,
      serviceName: n.booking.service.name,
      staffName: n.booking.staff.name,
      startTime: n.booking.startTime,
      timezone: n.booking.business.timezone,
      customerName: n.booking.customer.name,
      bookingUrl,
    });

    const result = await sendSms({ to: n.toPhone!, body });
    return { providerId: result.providerId ?? null };
  }

  throw new Error(`Unsupported notification channel: ${n.channel}`);
}
