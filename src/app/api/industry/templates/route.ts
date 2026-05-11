import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.industryTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      key: true,
      name: true,
      category: true,
      description: true,
      defaultConfig: true,
    },
  });

  return NextResponse.json({ success: true, data: templates });
}

