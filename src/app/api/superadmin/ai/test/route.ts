import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getApiKey(provider: string) {
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY ?? process.env.AI_API_KEY ?? null;
  if (provider === "openai") return process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY ?? null;
  if (provider === "gemini") return process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY ?? null;
  return process.env.AI_API_KEY ?? null;
}

async function testOpenAiCompatible(baseUrl: string, apiKey: string, model: string) {
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(process.env.NEXT_PUBLIC_APP_URL ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL, "X-Title": "Diamond Booking" } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    }),
    cache: "no-store",
  });
  if (res.ok) return { ok: true, error: null as string | null };
  const json = await res.json().catch(() => null) as any;
  const msg = json?.error?.message ?? json?.message ?? `HTTP ${res.status}`;
  return { ok: false, error: msg as string };
}

async function testGemini(apiKey: string, model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      generationConfig: { maxOutputTokens: 1 },
    }),
    cache: "no-store",
  });
  if (res.ok) return { ok: true, error: null as string | null };
  const json = await res.json().catch(() => null) as any;
  const msg = json?.error?.message ?? `HTTP ${res.status}`;
  return { ok: false, error: msg as string };
}

export async function POST() {
  try {
    await requireSuperAdmin();
    const settings = await prisma.platformSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, supportEmail: "support@diamond-booking.com", updatedAt: new Date() },
    });

    const provider = settings.aiProvider || "openrouter";
    const model = settings.aiModel || "openai/gpt-4o-mini";
    const apiKey = getApiKey(provider);

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing API key for selected provider" },
        { status: 400 }
      );
    }

    const start = Date.now();
    let result: { ok: boolean; error: string | null };
    if (provider === "openrouter") {
      result = await testOpenAiCompatible("https://openrouter.ai/api/v1", apiKey, model);
    } else if (provider === "openai") {
      result = await testOpenAiCompatible("https://api.openai.com/v1", apiKey, model);
    } else {
      result = await testGemini(apiKey, model);
    }
    const latencyMs = Date.now() - start;

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Test failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { provider, model, latencyMs },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Test failed" }, { status: 500 });
  }
}

