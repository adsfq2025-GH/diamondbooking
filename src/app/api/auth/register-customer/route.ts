import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  businessSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const business = await prisma.business.findUnique({
      where: { slug: parsed.data.businessSlug },
      select: { id: true },
    });
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, portalBusinessId: true },
    });
    if (existing) {
      if (existing.role !== Role.CUSTOMER) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }
      if (existing.portalBusinessId && existing.portalBusinessId !== business.id) {
        return NextResponse.json({ error: "This account is linked to a different business" }, { status: 409 });
      }
      if (!existing.portalBusinessId) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { portalBusinessId: business.id },
        });
      }
      await prisma.customer.upsert({
        where: { businessId_email: { businessId: business.id, email } },
        update: { name: parsed.data.name },
        create: { businessId: business.id, name: parsed.data.name, email },
      });
      return NextResponse.json({ success: true });
    }

    const hashed = await bcrypt.hash(parsed.data.password, 12);

    await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        password: hashed,
        role: Role.CUSTOMER,
        emailVerified: new Date(),
        portalBusinessId: business.id,
      },
    });

    await prisma.customer.upsert({
      where: { businessId_email: { businessId: business.id, email } },
      update: { name: parsed.data.name },
      create: { businessId: business.id, name: parsed.data.name, email },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
