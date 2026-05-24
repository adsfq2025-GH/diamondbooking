import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function pick(components: AddressComponent[], type: string) {
  return components.find((c) => c.types.includes(type));
}

export async function GET(req: NextRequest) {
  await requireOwner();

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ success: false, error: "GOOGLE_MAPS_API_KEY is not configured" }, { status: 500 });
  }

  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", id);
  url.searchParams.set("fields", "address_component");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as {
    status?: string;
    error_message?: string;
    result?: { address_components?: AddressComponent[] };
  };

  if (!res.ok || json.status === "REQUEST_DENIED") {
    return NextResponse.json({ success: false, error: json.error_message ?? "Address details lookup failed" }, { status: 500 });
  }

  const components = json.result?.address_components ?? [];
  const streetNumber = pick(components, "street_number")?.long_name ?? "";
  const route = pick(components, "route")?.long_name ?? "";
  const street = [streetNumber, route].filter(Boolean).join(" ").trim();
  const city =
    pick(components, "locality")?.long_name ??
    pick(components, "postal_town")?.long_name ??
    pick(components, "sublocality")?.long_name ??
    "";
  const state = pick(components, "administrative_area_level_1")?.short_name ?? "";
  const zip = pick(components, "postal_code")?.long_name ?? "";

  return NextResponse.json({
    success: true,
    data: { street, city, state, zip },
  });
}

