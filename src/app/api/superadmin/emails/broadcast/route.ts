// src/app/api/superadmin/emails/broadcast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpFromHeaders } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const { subject, body, recipientType } = await req.json();
    const ip = getIpFromHeaders(req.headers);

    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ success: false, error: "Subject and body are required" }, { status: 400 });
    }

    // Determine recipients
    let where = {};
    if (recipientType.startsWith("plan:")) {
      const plan = recipientType.split(":")[1];
      where = { subscription: { plan } };
    } else if (recipientType.startsWith("status:")) {
      const status = recipientType.split(":")[1];
      where = { subscription: { status } };
    }

    const users = await prisma.user.findMany({
      where: { isActive: true, role: { not: "SUPER_ADMIN" }, ...where },
      select: { email: true, name: true },
    });

    // Log the broadcast (actual email sending would use Resend here)
    await prisma.broadcastEmail.create({
      data: {
        subject,
        body,
        recipientType,
        recipientCount: users.length,
        sentAt: new Date(),
        status: "sent",
      },
    });

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "ADMIN_BROADCAST_EMAIL_SENT",
      targetType: "Platform",
      targetId: "broadcast",
      targetName: subject,
      metadata: { recipientType, recipientCount: users.length },
      ipAddress: ip,
    });

    // TODO: Use Resend batch send in production
    // const { Resend } = await import("resend");
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // for (const user of users) {
    //   await resend.emails.send({ from: "...", to: user.email, subject, html: body });
    // }

    return NextResponse.json({ success: true, data: { recipientCount: users.length } });
  } catch (error) {
    console.error("[broadcast email]", error);
    return NextResponse.json({ success: false, error: "Failed to send broadcast" }, { status: 500 });
  }
}
