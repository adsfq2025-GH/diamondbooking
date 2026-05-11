import { PromotionsManager } from "@/components/dashboard/promotions-manager";

export const metadata = { title: "Promotions" };
export const dynamic = "force-dynamic";

export default function PromotionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Promotions</h1>
        <p className="text-muted-foreground">Create promo codes and limited-time offers.</p>
      </div>
      <PromotionsManager />
    </div>
  );
}

