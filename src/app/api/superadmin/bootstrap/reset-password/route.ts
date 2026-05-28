import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const secret = process.env.SUPER_ADMIN_BOOTSTRAP_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: "Bootstrap disabled" }, { status: 403 });
  }
  const provided = req.headers.get("x-bootstrap-secret");
  if (!provided || provided !== secret) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const superAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true },
  });

  if (!superAdmin) {
    return NextResponse.json({ success: false, error: "No super admin exists" }, { status: 404 });
  }

  if (superAdmin.email.toLowerCase() !== normalizedEmail) {
    return NextResponse.json(
      { success: false, error: "Email does not match the existing super admin account" },
      { status: 403 }
    );
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: superAdmin.id },
    data: { password: hashedPassword, isActive: true, emailVerified: new Date() },
  });

  return NextResponse.json({ success: true });
}

