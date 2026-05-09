// src/lib/email.ts
// Transactional email service via Resend

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.RESEND_FROM_NAME ?? "Diamond Booking"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@diamondbooking.com"}>`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BookingEmailData {
  customerName:  string;
  customerEmail: string;
  businessName:  string;
  serviceName:   string;
  staffName:     string;
  startTime:     Date;
  timezone:      string;
  bookingId:     string;
  notes?:        string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
    hour:    "numeric",
    minute:  "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(date);
}

// ── Email: Booking confirmation to client ──────────────────────────────────────

export async function sendBookingConfirmation(data: BookingEmailData) {
  const dateStr = formatDateTime(data.startTime, data.timezone);

  try {
    await resend.emails.send({
      from:    FROM,
      to:      data.customerEmail,
      subject: `Booking confirmed: ${data.serviceName} at ${data.businessName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:#1a1f36;padding:32px 40px;text-align:center">
          <p style="margin:0;font-size:22px;font-weight:800;color:#fff">✓ You're booked!</p>
          <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.6)">${data.businessName}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <p style="margin:0 0 24px;font-size:16px;color:#333">Hi ${data.customerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6">
            Your appointment is confirmed. Here are the details:
          </p>
          <!-- Details box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border-radius:12px;border:1px solid #e8eaf0;margin-bottom:24px">
            <tr><td style="padding:24px">
              ${[
                ["Service",  data.serviceName],
                ["With",     data.staffName],
                ["When",     dateStr],
                ...(data.notes ? [["Notes", data.notes]] : []),
              ].map(([label, value]) => `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
                <tr>
                  <td width="80" style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.5px;vertical-align:top;padding-top:2px">${label}</td>
                  <td style="font-size:15px;color:#1a1f36;font-weight:600">${value}</td>
                </tr>
              </table>`).join("")}
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#999">Need to make changes? Contact ${data.businessName} directly.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;font-size:12px;color:#bbb">Powered by Diamond Booking</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[email] Booking confirmation failed:", err);
  }
}

// ── Email: New booking notification to business owner ─────────────────────────

export async function sendNewBookingNotification(data: BookingEmailData & { ownerEmail: string }) {
  const dateStr = formatDateTime(data.startTime, data.timezone);

  try {
    await resend.emails.send({
      from:    FROM,
      to:      data.ownerEmail,
      subject: `New booking: ${data.customerName} — ${data.serviceName}`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:40px 20px;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#1a1f36">📅 New booking</p>
    <p style="margin:0 0 24px;font-size:14px;color:#999">${data.businessName}</p>
    <table width="100%" cellpadding="8" style="border-collapse:collapse;font-size:14px">
      ${[
        ["Client",  data.customerName],
        ["Service", data.serviceName],
        ["Staff",   data.staffName],
        ["When",    dateStr],
      ].map(([k, v]) => `<tr style="border-bottom:1px solid #f0f0f0"><td style="color:#999;width:80px">${k}</td><td style="color:#1a1f36;font-weight:600">${v}</td></tr>`).join("")}
    </table>
    <p style="margin:24px 0 0;font-size:12px;color:#ccc">Manage in your Diamond Booking dashboard</p>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[email] New booking notification failed:", err);
  }
}

// ── Email: Booking reminder (24h before) ─────────────────────────────────────

export async function sendBookingReminder(data: BookingEmailData) {
  const dateStr = formatDateTime(data.startTime, data.timezone);

  try {
    await resend.emails.send({
      from:    FROM,
      to:      data.customerEmail,
      subject: `Reminder: ${data.serviceName} tomorrow at ${data.businessName}`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:40px 20px;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a1f36">⏰ Reminder: You have an appointment tomorrow</p>
    <p style="font-size:14px;color:#555">Hi ${data.customerName}, just a reminder about your upcoming appointment:</p>
    <div style="background:#f8f9ff;border-radius:8px;padding:20px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1f36">${data.serviceName}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#666">With ${data.staffName}</p>
      <p style="margin:0;font-size:13px;color:#666">${dateStr}</p>
    </div>
    <p style="font-size:12px;color:#bbb">This is an automated reminder from ${data.businessName} via Diamond Booking</p>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[email] Reminder failed:", err);
  }
}

// ── Email: Booking cancellation ───────────────────────────────────────────────

export async function sendCancellationEmail(data: BookingEmailData) {
  try {
    await resend.emails.send({
      from:    FROM,
      to:      data.customerEmail,
      subject: `Booking cancelled: ${data.serviceName} at ${data.businessName}`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:40px 20px;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a1f36">Booking Cancelled</p>
    <p style="font-size:14px;color:#555">Hi ${data.customerName}, your appointment for <strong>${data.serviceName}</strong> has been cancelled.</p>
    <p style="font-size:14px;color:#555">Please contact ${data.businessName} to reschedule.</p>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[email] Cancellation email failed:", err);
  }
}

// ── Email: Welcome ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  try {
    await resend.emails.send({
      from:    FROM,
      to,
      subject: "Welcome to Diamond Booking 💎",
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:40px 20px;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:40px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="width:56px;height:56px;background:#1a1f36;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:24px">💎</div>
    </div>
    <p style="font-size:22px;font-weight:800;color:#1a1f36;margin:0 0 8px">Welcome, ${name}!</p>
    <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px">
      Your Diamond Booking account is ready. Here's how to get started:
    </p>
    ${["Complete your business profile", "Add your services and set pricing", "Share your booking link with clients"].map((s, i) => `
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px">
      <div style="width:28px;height:28px;background:#d4a843;border-radius:8px;color:#1a1f36;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i + 1}</div>
      <p style="margin:0;padding-top:4px;font-size:14px;color:#555">${s}</p>
    </div>`).join("")}
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
       style="display:block;text-align:center;padding:14px;background:#1a1f36;color:#fff;font-weight:700;font-size:15px;border-radius:12px;text-decoration:none;margin-top:24px">
      Go to Dashboard →
    </a>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[email] Welcome email failed:", err);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Reset your Diamond Booking password",
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:40px 20px;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <p style="margin:0 0 12px;font-size:18px;font-weight:800;color:#1a1f36">Reset your password</p>
    <p style="margin:0 0 18px;font-size:14px;color:#555;line-height:1.6">
      Click the button below to set a new password. This link expires in 1 hour.
    </p>
    <a href="${resetUrl}"
       style="display:inline-block;padding:12px 16px;background:#1a1f36;color:#fff;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none">
      Reset password
    </a>
    <p style="margin:18px 0 0;font-size:12px;color:#999;line-height:1.6">
      If you didn’t request this, you can ignore this email.
    </p>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[email] Password reset email failed:", err);
  }
}
