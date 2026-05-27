import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INDUSTRY_TEMPLATES } from "@/lib/industry/templates";

export async function POST() {
  try {
    await requireSuperAdmin();
    let upserted = 0;

    for (const tpl of INDUSTRY_TEMPLATES) {
      await prisma.industryTemplate.upsert({
        where: { key: tpl.key },
        update: {
          name: tpl.name,
          category: tpl.category,
          description: tpl.description ?? null,
          defaultConfig: tpl.defaultConfig as unknown as object,
          isActive: true,
          sortOrder: tpl.sortOrder ?? 0,
        },
        create: {
          key: tpl.key,
          name: tpl.name,
          category: tpl.category,
          description: tpl.description ?? null,
          defaultConfig: tpl.defaultConfig as unknown as object,
          isActive: true,
          sortOrder: tpl.sortOrder ?? 0,
        },
      });
      upserted += 1;
    }

    return NextResponse.json({ success: true, data: { upserted } });
  } catch {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
}

