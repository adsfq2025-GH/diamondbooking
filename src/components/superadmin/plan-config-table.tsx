// src/components/superadmin/plan-config-table.tsx
"use client";

import type { PlanConfig } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { Check, X } from "lucide-react";

export function PlanConfigTable({ plans }: { plans: PlanConfig[] }) {
  const Feature = ({ ok }: { ok: boolean }) =>
    ok ? <Check className="w-4 h-4 text-green-400 mx-auto" />
       : <X className="w-4 h-4 text-muted-foreground mx-auto" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Plan</th>
            <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Monthly</th>
            <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Yearly</th>
            <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Staff</th>
            <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Services</th>
            <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Bookings/mo</th>
            <th className="py-2 pr-4 text-xs font-medium text-muted-foreground text-center">Branding</th>
            <th className="py-2 pr-4 text-xs font-medium text-muted-foreground text-center">Reminders</th>
            <th className="py-2 text-xs font-medium text-muted-foreground text-center">Custom Domain</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {plans.map((plan) => (
            <tr key={plan.id} className="hover:bg-secondary/50">
              <td className="py-3 pr-4">
                <span className="font-semibold text-foreground">{plan.displayName}</span>
              </td>
              <td className="py-3 pr-4 text-foreground">
                {Number(plan.priceMonthly) > 0 ? formatCurrency(Number(plan.priceMonthly)) : "Free"}
              </td>
              <td className="py-3 pr-4 text-foreground">
                {Number(plan.priceYearly) > 0 ? formatCurrency(Number(plan.priceYearly)) : "Free"}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">
                {plan.maxStaff === -1 ? "∞" : plan.maxStaff}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">
                {plan.maxServices === -1 ? "∞" : plan.maxServices}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">
                {plan.maxBookingsPerMonth === -1 ? "∞" : plan.maxBookingsPerMonth}
              </td>
              <td className="py-3 pr-4 text-center">
                <Feature ok={plan.removesBranding} />
              </td>
              <td className="py-3 pr-4 text-center">
                <Feature ok={plan.emailReminders} />
              </td>
              <td className="py-3 text-center">
                <Feature ok={plan.customDomain} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
