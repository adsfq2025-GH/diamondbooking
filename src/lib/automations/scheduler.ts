import { prisma } from "@/lib/prisma";
import { getAutomationsConfig } from "@/lib/automations/config";
import { normalizePhoneE164 } from "@/lib/sms";
import { NotificationType, Prisma } from "@prisma/client";

function uniqueOffsets(offsets: number[]) {
  return [...new Set(offsets.filter((offset) => Number.isInteger(offset) && offset > 0))].sort((a, b) => a - b);
}

export async function scheduleRemindersForBooking(args: { bookingId: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      businessId: true,
      customerId: true,
      startTime: true,
      status: true,
      business: { select: { id: true, timezone: true, slug: true, name: true, ownerId: true } },
      customer: { select: { id: true, name: true, email: true, phone: true } },
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });

  if (!booking) return;
  if (booking.status === "CANCELLED") return;

  const businessConfig = await prisma.businessConfig.findUnique({
    where: { businessId: booking.businessId },
    select: { config: true },
  });
  const config = getAutomationsConfig(businessConfig?.config ?? {});

  const toPhone = normalizePhoneE164(booking.customer.phone);
  const now = new Date();
  const desiredOffsets = config.notifications.reminders.enabled ? uniqueOffsets(config.notifications.reminders.offsetsMinutes) : [];
  const desiredKeys = desiredOffsets.map((offsetMinutes) => `offset:${offsetMinutes}`);
  const reminderScheduledAt = (offsetMinutes: number) => {
    const reminderTime = new Date(booking.startTime.getTime() - offsetMinutes * 60 * 1000);
    return reminderTime.getTime() <= now.getTime() ? now : reminderTime;
  };

  if (config.notifications.email) {
    if (desiredOffsets.length) {
      for (const offsetMinutes of desiredOffsets) {
        const dedupeKey = `offset:${offsetMinutes}`;
        await prisma.scheduledNotification.upsert({
          where: {
            bookingId_type_channel_dedupeKey: {
              bookingId: booking.id,
              type: "BOOKING_REMINDER",
              channel: "EMAIL",
              dedupeKey,
            },
          },
          create: {
            businessId: booking.businessId,
            bookingId: booking.id,
            customerId: booking.customerId,
            channel: "EMAIL",
            type: "BOOKING_REMINDER",
            dedupeKey,
            toEmail: booking.customer.email,
            scheduledAt: reminderScheduledAt(offsetMinutes),
            payload: {
              offsetMinutes,
            } as Prisma.InputJsonValue,
          },
          update: {
            status: "PENDING",
            scheduledAt: reminderScheduledAt(offsetMinutes),
            toEmail: booking.customer.email,
            payload: {
              offsetMinutes,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    await prisma.scheduledNotification.updateMany({
      where: {
        bookingId: booking.id,
        type: "BOOKING_REMINDER",
        channel: "EMAIL",
        status: { in: ["PENDING", "PROCESSING"] },
        ...(desiredKeys.length ? { dedupeKey: { notIn: desiredKeys } } : {}),
      },
      data: { status: "CANCELLED", lockedAt: null, lastError: null },
    });
  } else {
    await prisma.scheduledNotification.updateMany({
      where: {
        bookingId: booking.id,
        type: "BOOKING_REMINDER",
        channel: "EMAIL",
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: { status: "CANCELLED", lockedAt: null, lastError: null },
    });
  }

  if (config.notifications.sms && toPhone) {
    if (desiredOffsets.length) {
      for (const offsetMinutes of desiredOffsets) {
        const dedupeKey = `offset:${offsetMinutes}`;
        await prisma.scheduledNotification.upsert({
          where: {
            bookingId_type_channel_dedupeKey: {
              bookingId: booking.id,
              type: "BOOKING_REMINDER",
              channel: "SMS",
              dedupeKey,
            },
          },
          create: {
            businessId: booking.businessId,
            bookingId: booking.id,
            customerId: booking.customerId,
            channel: "SMS",
            type: "BOOKING_REMINDER",
            dedupeKey,
            toPhone,
            scheduledAt: reminderScheduledAt(offsetMinutes),
            payload: {
              offsetMinutes,
            } as Prisma.InputJsonValue,
          },
          update: {
            status: "PENDING",
            scheduledAt: reminderScheduledAt(offsetMinutes),
            toPhone,
            payload: {
              offsetMinutes,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    await prisma.scheduledNotification.updateMany({
      where: {
        bookingId: booking.id,
        type: "BOOKING_REMINDER",
        channel: "SMS",
        status: { in: ["PENDING", "PROCESSING"] },
        ...(desiredKeys.length ? { dedupeKey: { notIn: desiredKeys } } : {}),
      },
      data: { status: "CANCELLED", lockedAt: null, lastError: null },
    });
  } else {
    await prisma.scheduledNotification.updateMany({
      where: {
        bookingId: booking.id,
        type: "BOOKING_REMINDER",
        channel: "SMS",
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: { status: "CANCELLED", lockedAt: null, lastError: null },
    });
  }
}

export async function cancelScheduledNotifications(args: { bookingId: string; types?: NotificationType[] }) {
  const types: NotificationType[] = args.types?.length ? args.types : ["BOOKING_CONFIRMATION", "BOOKING_REMINDER", "BOOKING_FOLLOW_UP"];
  await prisma.scheduledNotification.updateMany({
    where: {
      bookingId: args.bookingId,
      type: { in: types },
      status: { in: ["PENDING", "PROCESSING"] },
    },
    data: { status: "CANCELLED", lockedAt: null },
  });
}

export async function scheduleCancellationNotifications(args: { bookingId: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      businessId: true,
      customerId: true,
      startTime: true,
      business: { select: { id: true } },
      customer: { select: { id: true, email: true, phone: true } },
    },
  });
  if (!booking) return;

  const businessConfig = await prisma.businessConfig.findUnique({
    where: { businessId: booking.businessId },
    select: { config: true },
  });
  const config = getAutomationsConfig(businessConfig?.config ?? {});

  const toPhone = normalizePhoneE164(booking.customer.phone);
  const scheduledAt = new Date();
  const dedupeKey = "default";

  if (config.notifications.email && config.notifications.cancellation.email) {
    await prisma.scheduledNotification.upsert({
      where: { bookingId_type_channel_dedupeKey: { bookingId: booking.id, type: "BOOKING_CANCELLATION", channel: "EMAIL", dedupeKey } },
      create: {
        businessId: booking.businessId,
        bookingId: booking.id,
        customerId: booking.customerId,
        channel: "EMAIL",
        type: "BOOKING_CANCELLATION",
        dedupeKey,
        toEmail: booking.customer.email,
        scheduledAt,
        payload: {} as Prisma.InputJsonValue,
      },
      update: {
        status: "PENDING",
        scheduledAt,
        toEmail: booking.customer.email,
      },
    });
  }

  if (config.notifications.sms && config.notifications.cancellation.sms && toPhone) {
    await prisma.scheduledNotification.upsert({
      where: { bookingId_type_channel_dedupeKey: { bookingId: booking.id, type: "BOOKING_CANCELLATION", channel: "SMS", dedupeKey } },
      create: {
        businessId: booking.businessId,
        bookingId: booking.id,
        customerId: booking.customerId,
        channel: "SMS",
        type: "BOOKING_CANCELLATION",
        dedupeKey,
        toPhone,
        scheduledAt,
        payload: {} as Prisma.InputJsonValue,
      },
      update: {
        status: "PENDING",
        scheduledAt,
        toPhone,
      },
    });
  }
}

export async function scheduleFollowUpNotifications(args: { bookingId: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      businessId: true,
      customerId: true,
      startTime: true,
      business: { select: { id: true } },
      customer: { select: { id: true, email: true, phone: true } },
    },
  });
  if (!booking) return;

  const businessConfig = await prisma.businessConfig.findUnique({
    where: { businessId: booking.businessId },
    select: { config: true },
  });
  const config = getAutomationsConfig(businessConfig?.config ?? {});
  if (!config.notifications.followUp.enabled) return;

  const toPhone = normalizePhoneE164(booking.customer.phone);
  const scheduledAt = new Date(booking.startTime.getTime() + config.notifications.followUp.offsetMinutes * 60 * 1000);
  const dedupeKey = "default";

  if (config.notifications.email) {
    await prisma.scheduledNotification.upsert({
      where: { bookingId_type_channel_dedupeKey: { bookingId: booking.id, type: "BOOKING_FOLLOW_UP", channel: "EMAIL", dedupeKey } },
      create: {
        businessId: booking.businessId,
        bookingId: booking.id,
        customerId: booking.customerId,
        channel: "EMAIL",
        type: "BOOKING_FOLLOW_UP",
        dedupeKey,
        toEmail: booking.customer.email,
        scheduledAt,
        payload: {} as Prisma.InputJsonValue,
      },
      update: {
        status: "PENDING",
        scheduledAt,
        toEmail: booking.customer.email,
      },
    });
  }

  if (config.notifications.sms && toPhone) {
    await prisma.scheduledNotification.upsert({
      where: { bookingId_type_channel_dedupeKey: { bookingId: booking.id, type: "BOOKING_FOLLOW_UP", channel: "SMS", dedupeKey } },
      create: {
        businessId: booking.businessId,
        bookingId: booking.id,
        customerId: booking.customerId,
        channel: "SMS",
        type: "BOOKING_FOLLOW_UP",
        dedupeKey,
        toPhone,
        scheduledAt,
        payload: {} as Prisma.InputJsonValue,
      },
      update: {
        status: "PENDING",
        scheduledAt,
        toPhone,
      },
    });
  }
}
