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
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwner();
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    // Check if business already exists
    const existing = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
    if (existing) {
      const updated = await prisma.business.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug ? parsed.data.slug : existing.slug,
          industry: parsed.data.industry,
          phone: parsed.data.phone,
          timezone: parsed.data.timezone,
          description: parsed.data.description ?? null,
          address: parsed.data.address ?? null,
          city: parsed.data.city ?? null,
          state: parsed.data.state ?? null,
          zipCode: parsed.data.zipCode ?? null,
          website: parsed.data.website ? parsed.data.website : null,
        },
      });
      const cfg = await prisma.businessConfig.findUnique({ where: { businessId: existing.id }, select: { id: true } });
      if (!cfg) {
        const industryKey = (existing.industry as string | null) ?? "generic";
        const template = await prisma.industryTemplate.findFirst({
          where: { key: industryKey, isActive: true },
          select: { key: true, defaultConfig: true },
        });
        const fallback = await prisma.industryTemplate.findFirst({
          where: { key: "generic", isActive: true },
          select: { key: true, defaultConfig: true },
        });
        await prisma.businessConfig.create({
          data: {
            businessId: existing.id,
            industryKey: template?.key ?? fallback?.key ?? industryKey,
            config: template?.defaultConfig ?? fallback?.defaultConfig ?? {},
          },
        });
      }
      return NextResponse.json({ success: true, data: updated });
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
        description: parsed.data.description ?? null,
        address: parsed.data.address ?? null,
        city: parsed.data.city ?? null,
        state: parsed.data.state ?? null,
        zipCode: parsed.data.zipCode ?? null,
        website: parsed.data.website ? parsed.data.website : null,
        onboardingComplete: false,
      },
    });

    const industryKey = parsed.data.industry ?? "generic";
    const template = await prisma.industryTemplate.findFirst({
      where: { key: industryKey, isActive: true },
      select: { key: true, defaultConfig: true },
    });
    const fallback = await prisma.industryTemplate.findFirst({
      where: { key: "generic", isActive: true },
      select: { key: true, defaultConfig: true },
    });

    await prisma.businessConfig.create({
      data: {
        businessId: business.id,
        industryKey: template?.key ?? fallback?.key ?? industryKey,
        config: template?.defaultConfig ?? fallback?.defaultConfig ?? {},
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
