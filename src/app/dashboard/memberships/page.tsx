import { MembershipsManager } from "@/components/dashboard/memberships-manager";

export const metadata = { title: "Memberships" };
export const dynamic = "force-dynamic";

export default function MembershipsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Memberships</h1>
        <p className="text-muted-foreground">Create VIP plans, maintenance plans, and subscription discounts.</p>
      </div>
      <MembershipsManager />
    </div>
  );
}

