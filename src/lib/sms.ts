export function normalizePhoneE164(input: string | null | undefined) {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  if (raw.startsWith("+")) {
    const digits = raw.replace(/[^\d+]/g, "");
    if (/^\+\d{10,15}$/.test(digits)) return digits;
    return null;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function sendSms(args: { to: string; body: string }) {
  const to = normalizePhoneE164(args.to);
  if (!to) throw new Error("Invalid phone number");

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) throw new Error("Missing Twilio configuration");

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams();
  params.set("From", from);
  params.set("To", to);
  params.set("Body", args.body);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: params.toString(),
  });

  const data = (await res.json().catch(() => null)) as { sid?: string; message?: string; code?: number } | null;

  if (!res.ok) {
    const msg = data?.message ? String(data.message) : `Twilio request failed (${res.status})`;
    throw new Error(msg);
  }

  return { to, providerId: data?.sid ?? null };
}

export function buildBookingSms(args: {
  type: "BOOKING_CONFIRMATION" | "BOOKING_REMINDER" | "BOOKING_CANCELLATION" | "BOOKING_FOLLOW_UP";
  businessName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  timezone: string;
  customerName: string;
  bookingUrl?: string;
}) {
  const when = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: args.timezone,
  }).format(args.startTime);

  const base = `${args.businessName}: ${args.serviceName} on ${when}.`;

  if (args.type === "BOOKING_CONFIRMATION") {
    return `Confirmed. ${base}${args.bookingUrl ? ` ${args.bookingUrl}` : ""}`;
  }
  if (args.type === "BOOKING_REMINDER") {
    return `Reminder. ${base}${args.bookingUrl ? ` ${args.bookingUrl}` : ""}`;
  }
  if (args.type === "BOOKING_CANCELLATION") {
    return `Cancelled. ${base}`;
  }
  return `Thanks for visiting ${args.businessName}. If you need anything else, reply to this message.`;
}

