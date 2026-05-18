import { BusinessConfigEditor } from "@/components/dashboard/business-config-editor";
import { PricingBuilder } from "@/components/dashboard/pricing-builder";

export const metadata = { title: "Pricing & Intake" };
export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Pricing & Intake</h1>
        <p className="text-muted-foreground">
          Configure live pricing and customer-facing booking fields.
        </p>
      </div>
      <PricingBuilder />
      <BusinessConfigEditor />
    </div>
  );
}
