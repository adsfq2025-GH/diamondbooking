import { z } from "zod";

const appliesToSchema = z
  .object({
    services: z.array(z.string()).optional(),
    addOns: z.array(z.string()).optional(),
    customerType: z.enum(["residential", "commercial"]).optional(),
  })
  .passthrough();

export type PromotionAppliesTo = z.infer<typeof appliesToSchema>;

export function normalizePromoCode(code: string | undefined) {
  if (!code) return null;
  const v = code.trim();
  if (!v) return null;
  return v.toUpperCase();
}

export function parsePromotionAppliesTo(input: unknown): PromotionAppliesTo {
  const parsed = appliesToSchema.safeParse(input);
  return parsed.success ? parsed.data : {};
}

export function isPromotionEligible(args: {
  promotion: {
    usageLimit: number | null;
    usageCount: number;
    minSubtotal: number | null;
    newCustomerOnly: boolean;
    memberOnly: boolean;
    appliesTo: unknown;
  };
  baseSubtotal: number;
  serviceId: string;
  addOnKeys: string[];
  customerType: "residential" | "commercial";
  isNewCustomer: boolean;
  isMember: boolean;
  hasCustomerContext: boolean;
}) {
  const { promotion } = args;

  if (promotion.usageLimit != null && promotion.usageCount >= promotion.usageLimit) return false;
  if (promotion.minSubtotal != null && args.baseSubtotal < promotion.minSubtotal) return false;

  if (promotion.newCustomerOnly) {
    if (!args.hasCustomerContext) return false;
    if (!args.isNewCustomer) return false;
  }

  if (promotion.memberOnly) {
    if (!args.hasCustomerContext) return false;
    if (!args.isMember) return false;
  }

  const appliesTo = parsePromotionAppliesTo(promotion.appliesTo);

  if (appliesTo.customerType && appliesTo.customerType !== args.customerType) return false;

  if (Array.isArray(appliesTo.services) && appliesTo.services.length > 0) {
    if (!appliesTo.services.includes(args.serviceId)) return false;
  }

  if (Array.isArray(appliesTo.addOns) && appliesTo.addOns.length > 0) {
    const selected = new Set(args.addOnKeys ?? []);
    const hit = appliesTo.addOns.some((k) => selected.has(k));
    if (!hit) return false;
  }

  return true;
}

