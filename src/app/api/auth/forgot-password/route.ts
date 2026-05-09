// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ success: true }); // silently fail

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true },
    });

    // Always return success to prevent email enumeration
    if (!user) return NextResponse.json({ success: true });

    // Create reset token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: { email: user.email, used: false },
      }),
      prisma.passwordResetToken.create({
        data: { email: user.email, token: tokenHash, expires },
      }),
    ]);

    // Send email via Resend
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ success: true }); // Never expose errors
  }
}
