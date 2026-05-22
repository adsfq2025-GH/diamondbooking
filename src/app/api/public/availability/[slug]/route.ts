// src/app/api/public/availability/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;

  const date      = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const staffId   = searchParams.get("staffId") ?? "any";
  const durationMinutesParam = searchParams.get("durationMinutes");
  const durationMinutes = durationMinutesParam ? Number(durationMinutesParam) : undefined;

  if (!date || !serviceId) {
    return NextResponse.json(
      { success: false, error: "date and serviceId are required" },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailableSlots({
      businessSlug: slug,
      serviceId,
      staffId,
      date,
      durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : undefined,
    });
    return NextResponse.json({ success: true, data: slots });
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json({ success: false, error: "Failed to load availability" }, { status: 500 });
  }
}
