// src/app/api/superadmin/audit-log/export/route.ts
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSuperAdmin();

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const headers = ["ID", "Timestamp", "User Email", "Action", "Target Type", "Target ID", "Target Name", "IP Address", "Impersonated"];
    const rows = logs.map((l) => [
      l.id,
      l.createdAt.toISOString(),
      l.userEmail ?? "",
      l.action,
      l.targetType,
      l.targetId,
      l.targetName ?? "",
      l.ipAddress ?? "",
      l.isImpersonated ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
}
