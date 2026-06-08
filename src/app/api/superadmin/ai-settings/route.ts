import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpFromHeaders } from "@/lib/audit";

const schema = z.object({
  aiEnabled: z.boolean(),
  aiProvider: z.enum(["openrouter", "openai", "gemini"]),
  aiModel: z.string().min(1).max(200),
  aiAllowAiAssisted: z.boolean(),
  aiAllowHybrid: z.boolean(),
  aiWebsiteFetchEnabled: z.boolean(),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
    if (!settings) return NextResponse.json({ success: false, error: "Missing settings" }, { status: 404 });
    return NextResponse.json({
      success: true,
      data: {
        aiEnabled: settings.aiEnabled,
        aiProvider: settings.aiProvider,
        aiModel: settings.aiModel,
        aiAllowAiAssisted: settings.aiAllowAiAssisted,
        aiAllowHybrid: settings.aiAllowHybrid,
        aiWebsiteFetchEnabled: settings.aiWebsiteFetchEnabled,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const ip = getIpFromHeaders(req.headers);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const updated = await prisma.platformSettings.upsert({
      where: { id: 1 },
      update: parsed.data,
      create: { id: 1, ...parsed.data, updatedAt: new Date() },
    });

    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "ADMIN_AI_SETTINGS_CHANGED",
      targetType: "Platform",
      targetId: "1",
      targetName: "AI Settings",
      metadata: parsed.data,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        aiEnabled: updated.aiEnabled,
        aiProvider: updated.aiProvider,
        aiModel: updated.aiModel,
        aiAllowAiAssisted: updated.aiAllowAiAssisted,
        aiAllowHybrid: updated.aiAllowHybrid,
        aiWebsiteFetchEnabled: updated.aiWebsiteFetchEnabled,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update AI settings" }, { status: 500 });
  }
}

