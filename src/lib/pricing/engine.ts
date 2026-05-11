import { z } from "zod";

const money = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

const configSchema = z.object({
  addOns: z
    .array(z.object({ key: z.string(), name: z.string(), price: z.number(), extraMinutes: z.number().optional() }))
    .default([]),
  intakeFields: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(["text", "number", "select", "boolean"]),
        required: z.boolean().optional(),
        options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
        pricing: z
          .union([
            z.object({ type: z.literal("perUnit"), unitPrice: z.number() }),
            z.object({ type: z.literal("choicePrice"), prices: z.record(z.number()) }),
          ])
          .optional(),
      })
    )
    .default([]),
  customerTypes: z
    .object({
      enabled: z.boolean(),
      options: z.array(z.enum(["residential", "commercial"])),
      commercialMultiplier: z.number().optional(),
    })
    .optional(),
  recurring: z
    .object({
      enabled: z.boolean(),
      intervals: z.array(z.object({ key: z.string(), label: z.string(), discountPercent: z.number() })),
    })
    .optional(),
});

export type PricingQuoteInput = {
  basePrice: number;
  currency: string;
  intake: Record<string, unknown>;
  addOnKeys: string[];
  isCommercial: boolean;
  recurringInterval?: string;
  promo?: { type: "PERCENT" | "FIXED"; percentOff?: number | null; amountOff?: number | null };
  membership?: { discountPercent?: number | null };
  config: unknown;
};

export type PricingQuote = {
  currency: string;
  subtotal: number;
  discounts: number;
  total: number;
  breakdown: Array<{ label: string; amount: number }>;
};

export function computeQuote(input: PricingQuoteInput): PricingQuote {
  const cfg = configSchema.safeParse(input.config);
  const config = cfg.success ? cfg.data : configSchema.parse({});

  let subtotal = money(input.basePrice);
  const breakdown: Array<{ label: string; amount: number }> = [];

  breakdown.push({ label: "Base service", amount: money(input.basePrice) });

  const intake = input.intake ?? {};

  for (const field of config.intakeFields) {
    if (!field.pricing) continue;
    const raw = (intake as Record<string, unknown>)[field.key];

    if (field.pricing.type === "perUnit") {
      const units = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(units) || units <= 0) continue;
      const add = money(units * field.pricing.unitPrice);
      if (add !== 0) {
        subtotal = money(subtotal + add);
        breakdown.push({ label: field.label, amount: add });
      }
    }

    if (field.pricing.type === "choicePrice") {
      const choiceKey = String(raw);
      const add = money(field.pricing.prices[choiceKey] ?? 0);
      if (add !== 0) {
        subtotal = money(subtotal + add);
        breakdown.push({ label: field.label, amount: add });
      }
    }
  }

  for (const key of input.addOnKeys ?? []) {
    const addOn = config.addOns.find((a) => a.key === key);
    if (!addOn) continue;
    const add = money(addOn.price);
    subtotal = money(subtotal + add);
    breakdown.push({ label: addOn.name, amount: add });
  }

  if (input.isCommercial && config.customerTypes?.enabled && config.customerTypes.commercialMultiplier) {
    const factor = config.customerTypes.commercialMultiplier;
    const delta = money(subtotal * (factor - 1));
    if (delta !== 0) {
      subtotal = money(subtotal + delta);
      breakdown.push({ label: "Commercial pricing", amount: delta });
    }
  }

  let discounts = 0;

  if (config.recurring?.enabled && input.recurringInterval) {
    const interval = config.recurring.intervals.find((i) => i.key === input.recurringInterval);
    if (interval && interval.discountPercent > 0) {
      const d = money((subtotal * interval.discountPercent) / 100);
      discounts = money(discounts + d);
      breakdown.push({ label: `Recurring discount (${interval.discountPercent}%)`, amount: -d });
    }
  }

  const memberPct = input.membership?.discountPercent ?? 0;
  if (memberPct > 0) {
    const d = money((subtotal * memberPct) / 100);
    discounts = money(discounts + d);
    breakdown.push({ label: `Member discount (${memberPct}%)`, amount: -d });
  }

  if (input.promo) {
    if (input.promo.type === "PERCENT" && input.promo.percentOff && input.promo.percentOff > 0) {
      const d = money((subtotal * input.promo.percentOff) / 100);
      discounts = money(discounts + d);
      breakdown.push({ label: `Promo discount (${input.promo.percentOff}%)`, amount: -d });
    }
    if (input.promo.type === "FIXED" && input.promo.amountOff && input.promo.amountOff > 0) {
      const d = money(Math.min(subtotal, input.promo.amountOff));
      discounts = money(discounts + d);
      breakdown.push({ label: "Promo discount", amount: -d });
    }
  }

  const total = money(Math.max(0, subtotal - discounts));

  return {
    currency: input.currency,
    subtotal,
    discounts,
    total,
    breakdown,
  };
}

