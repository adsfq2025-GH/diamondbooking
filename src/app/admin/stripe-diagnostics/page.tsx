import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata = { title: "Stripe Diagnostics" };
export const dynamic = "force-dynamic";

export default async function AdminStripeDiagnosticsPage() {
  await requireSuperAdmin();
  redirect("/superadmin/stripe-diagnostics");
}

