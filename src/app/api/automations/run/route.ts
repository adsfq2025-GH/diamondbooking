import { NextRequest, NextResponse } from "next/server";
import { processDueNotifications } from "@/lib/automations/runner";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = process.env.AUTOMATIONS_CRON_SECRET ?? process.env.CRON_SECRET;
  if (req.headers.get("x-vercel-cron") === "1") return true;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueNotifications({ limit: 50, lockMinutes: 5, maxAttempts: 3 });
  return NextResponse.json({ success: true, data: result });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
