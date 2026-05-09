import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const tokenHash = sha256Hex(parsed.data.token);

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!tokenRecord || tokenRecord.used || tokenRecord.expires < new Date()) {
      return NextResponse.json(
        { success: false, error: "This reset link is invalid or expired. Please request a new one." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/auth/reset-password]", error);
    return NextResponse.json(
      { success: false, error: "Unable to reset password. Please try again." },
      { status: 500 }
    );
  }
}

