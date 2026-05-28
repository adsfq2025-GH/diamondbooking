import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100).optional(),
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
  const existingSuperAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  if (existingSuperAdmin) {
    return NextResponse.json({ success: false, error: "Super admin already exists" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: parsed.data.name ?? "Platform Admin",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: new Date(),
    },
    create: {
      email: normalizedEmail,
      name: parsed.data.name ?? "Platform Admin",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: new Date(),
    },
    select: { id: true, email: true },
  });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}

