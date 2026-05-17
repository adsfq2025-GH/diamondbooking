import { z } from "zod";

const reminderSchema = z.object({
  enabled: z.boolean().default(true),
  offsetsMinutes: z.array(z.number().int().min(1)).default([1440, 120]),
});

const followUpSchema = z.object({
  enabled: z.boolean().default(false),
  offsetMinutes: z.number().int().min(1).default(1440),
});

export const automationsConfigSchema = z.object({
  notifications: z
    .object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      confirmation: z
        .object({
          email: z.boolean().default(true),
          sms: z.boolean().default(false),
        })
        .default({ email: true, sms: false }),
      cancellation: z
        .object({
          email: z.boolean().default(true),
          sms: z.boolean().default(false),
        })
        .default({ email: true, sms: false }),
      reminders: reminderSchema.default({ enabled: true, offsetsMinutes: [1440, 120] }),
      followUp: followUpSchema.default({ enabled: false, offsetMinutes: 1440 }),
    })
    .default({
      email: true,
      sms: false,
      confirmation: { email: true, sms: false },
      cancellation: { email: true, sms: false },
      reminders: { enabled: true, offsetsMinutes: [1440, 120] },
      followUp: { enabled: false, offsetMinutes: 1440 },
    }),
});

export type AutomationsConfig = z.infer<typeof automationsConfigSchema>;

export function getAutomationsConfig(config: unknown): AutomationsConfig {
  const parsed = automationsConfigSchema.safeParse(config);
  if (parsed.success) return parsed.data;
  return automationsConfigSchema.parse({});
}

