// src/app/api/public/availability/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const querySchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  serviceId: z.string().trim().min(1, "serviceId is required"),
  staffId: z.string().trim().min(1).default("any"),
  durationMinutes: z.coerce.number().int().positive().max(480).optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;

  const parsed = querySchema.safeParse({
    date: searchParams.get("date"),
    serviceId: searchParams.get("serviceId"),
    staffId: searchParams.get("staffId") ?? "any",
    durationMinutes: searchParams.get("durationMinutes") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid availability request" },
      { status: 400 }
    );
  }

  try {
    const { date, serviceId, staffId, durationMinutes } = parsed.data;
    const slots = await getAvailableSlots({
      businessSlug: slug,
      serviceId,
      staffId,
      date,
      durationMinutes,
    });
    return NextResponse.json({ success: true, data: slots });
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json({ success: false, error: "Failed to load availability" }, { status: 500 });
  }
}
