import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireOwner();

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ success: false, error: "GOOGLE_MAPS_API_KEY is not configured" }, { status: 500 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const country = req.nextUrl.searchParams.get("country")?.trim() ?? "us";

  if (q.length < 3) {
    return NextResponse.json({ success: true, data: [] });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", q);
  url.searchParams.set("types", "address");
  url.searchParams.set("components", `country:${country.toLowerCase()}`);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as {
    status?: string;
    error_message?: string;
    predictions?: Array<{ place_id: string; description: string }>;
  };

  if (!res.ok || json.status === "REQUEST_DENIED") {
    return NextResponse.json({ success: false, error: json.error_message ?? "Address lookup failed" }, { status: 500 });
  }

  const data =
    (json.predictions ?? []).map((p) => ({
      id: p.place_id,
      label: p.description,
    })) ?? [];

  return NextResponse.json({ success: true, data });
}

