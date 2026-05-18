import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "@/lib/email";
import { Role } from "@prisma/client";

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const session = await requireOwner();
    const businessId = session.user.businessId;
    if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 });

    const { id } = await params;
    const staff = await prisma.staff.findFirst({
      where: { id, businessId },
      select: { id: true, email: true, name: true },
    });
    if (!staff?.email) return NextResponse.json({ error: "Staff email is required" }, { status: 400 });

    const email = staff.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, portalBusinessId: true },
    });

    if (existing?.portalBusinessId && existing.portalBusinessId !== businessId) {
      return NextResponse.json({ error: "This account is linked to a different business" }, { status: 409 });
    }

    const userId =
      existing?.id ??
      (
        await prisma.user.create({
          data: {
            email,
            name: staff.name,
            role: Role.STAFF,
            emailVerified: new Date(),
            password: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12),
            portalBusinessId: businessId,
          },
          select: { id: true },
        })
      ).id;

    if (existing && existing.role !== Role.STAFF) {
      await prisma.user.update({ where: { id: userId }, data: { role: Role.STAFF } });
    }
    if (existing && !existing.portalBusinessId) {
      await prisma.user.update({ where: { id: userId }, data: { portalBusinessId: businessId } });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { email, used: false } }),
      prisma.passwordResetToken.create({ data: { email, token: tokenHash, expires } }),
    ]);

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
