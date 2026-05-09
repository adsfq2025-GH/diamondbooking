// src/app/api/business/onboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  industry: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwner();
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    // Check if business already exists
    const existing = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    // Generate unique slug
    let slug = parsed.data.slug || generateSlug(parsed.data.name);
    const slugExists = await prisma.business.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const business = await prisma.business.create({
      data: {
        ownerId: session.user.id,
        name: parsed.data.name,
        slug,
        industry: parsed.data.industry,
        phone: parsed.data.phone,
        timezone: parsed.data.timezone ?? "America/New_York",
        onboardingComplete: false,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "BUSINESS_CREATED",
      targetType: "Business",
      targetId: business.id,
      targetName: business.name,
    });

    return NextResponse.json({ success: true, data: business }, { status: 201 });
  } catch (error) {
    console.error("[/api/business/onboard]", error);
    return NextResponse.json({ success: false, error: "Failed to create business" }, { status: 500 });
  }
}
