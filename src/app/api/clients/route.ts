import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().transform((v) => v.toLowerCase()),
  phone: z.string().optional().transform((v) => (v ? v.trim() : v)),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwner();
    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true },
    });
    if (!business) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const created = await prisma.customer.create({
      data: { businessId: business.id, ...parsed.data },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create client" }, { status: 500 });
  }
}
