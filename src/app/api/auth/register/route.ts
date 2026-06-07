// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { generateSlug } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
  { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
  { status: 400 }
);
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user + trial subscription in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          role: "OWNER",
          isActive: true,
          // In production, leave emailVerified null and send verification email
          // For MVP, auto-verify
          emailVerified: new Date(),
        },
      });

      const settings = await tx.platformSettings.findUnique({
        where: { id: 1 },
        select: { defaultTrialDays: true },
      });
      const trialDays = settings?.defaultTrialDays ?? 14;
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);

      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: "FREE",
          status: "TRIALING",
          trialStart: new Date(),
          trialEnd,
        },
      });

      const existingBusiness = await tx.business.findUnique({ where: { ownerId: newUser.id }, select: { id: true } });
      if (!existingBusiness) {
        const base = generateSlug(`${name} business`) || "business";
        const slug = `${base}-${newUser.id.slice(-6)}`;
        await tx.business.create({
          data: {
            ownerId: newUser.id,
            name: `${name}'s Business`,
            slug,
            timezone: "America/New_York",
            onboardingComplete: false,
          },
        });
      }

      return newUser;
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: "USER_REGISTERED",
      targetType: "User",
      targetId: user.id,
      targetName: user.email,
      metadata: { provider: "credentials", name },
    });

    return NextResponse.json(
      { success: true, data: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[/api/auth/register]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
