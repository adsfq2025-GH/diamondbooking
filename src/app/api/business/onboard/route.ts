// src/app/api/business/onboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { resolveIndustryTemplateKey } from "@/lib/industry/templates";
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
  const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const session = await requireOwner();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body", traceId }, { status: 400 });
    }
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      // #region debug-point B:onboard-validate-fail
      fetch("http://127.0.0.1:7777/event", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "onboarding-step1-reset",
          runId: "pre-fix",
          hypothesisId: "B",
          location: "api/business/onboard:validate",
          msg: "[DEBUG] onboard validation failed",
          data: { traceId, issue: parsed.error.issues[0]?.message },
          ts: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message, traceId }, { status: 400 });
    }

    // #region debug-point B:onboard-request
    fetch("http://127.0.0.1:7777/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "onboarding-step1-reset",
        runId: "pre-fix",
        hypothesisId: "B",
        location: "api/business/onboard:request",
        msg: "[DEBUG] onboard request parsed",
        data: { traceId, ownerId: session.user.id, name: parsed.data.name, slug: parsed.data.slug, industry: parsed.data.industry },
        ts: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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
        const rawIndustryKey = (existing.industry as string | null) ?? "generic";
        const industryKey = resolveIndustryTemplateKey(rawIndustryKey);
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
      // #region debug-point D:onboard-updated
      fetch("http://127.0.0.1:7777/event", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "onboarding-step1-reset",
          runId: "pre-fix",
          hypothesisId: "D",
          location: "api/business/onboard:update",
          msg: "[DEBUG] onboard updated existing",
          data: { traceId, businessId: updated.id, slug: updated.slug },
          ts: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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

    const rawIndustryKey = parsed.data.industry ?? "generic";
    const industryKey = resolveIndustryTemplateKey(rawIndustryKey);
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
    // #region debug-point D:onboard-created
    fetch("http://127.0.0.1:7777/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "onboarding-step1-reset",
        runId: "pre-fix",
        hypothesisId: "D",
        location: "api/business/onboard:create",
        msg: "[DEBUG] onboard created business",
        data: { traceId, businessId: business.id, slug: business.slug },
        ts: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ success: true, data: business }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      // #region debug-point B:onboard-unauth
      fetch("http://127.0.0.1:7777/event", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "onboarding-step1-reset",
          runId: "pre-fix",
          hypothesisId: "B",
          location: "api/business/onboard:error",
          msg: "[DEBUG] onboard unauthorized",
          data: { traceId },
          ts: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json({ success: false, error: "Session expired. Please sign in again.", traceId }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      // #region debug-point B:onboard-forbidden
      fetch("http://127.0.0.1:7777/event", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "onboarding-step1-reset",
          runId: "pre-fix",
          hypothesisId: "B",
          location: "api/business/onboard:error",
          msg: "[DEBUG] onboard forbidden",
          data: { traceId },
          ts: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json({ success: false, error: "You do not have permission to do that.", traceId }, { status: 403 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ success: false, error: "Business already exists or URL is already taken.", traceId }, { status: 409 });
      }
    }

    console.error("[/api/business/onboard]", { traceId, error });
    return NextResponse.json({ success: false, error: "Failed to create business", traceId }, { status: 500 });
  }
}
