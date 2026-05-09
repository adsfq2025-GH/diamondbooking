// src/components/dashboard/business-hours-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DAYS_OF_WEEK } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/use-toast";
import type { BusinessHours } from "@prisma/client";

interface BusinessHoursFormProps {
  businessId: string;
  hours: BusinessHours[];
}

const DEFAULT_HOURS: Record<number, { openTime: string; closeTime: string; isClosed: boolean }> = {
  0: { openTime: "09:00", closeTime: "17:00", isClosed: true },  // Sunday
  1: { openTime: "09:00", closeTime: "18:00", isClosed: false },
  2: { openTime: "09:00", closeTime: "18:00", isClosed: false },
  3: { openTime: "09:00", closeTime: "18:00", isClosed: false },
  4: { openTime: "09:00", closeTime: "18:00", isClosed: false },
  5: { openTime: "09:00", closeTime: "18:00", isClosed: false },
  6: { openTime: "09:00", closeTime: "17:00", isClosed: false }, // Saturday
};

export function BusinessHoursForm({ businessId, hours }: BusinessHoursFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Build initial state from DB or defaults
  const initialState = DAYS_OF_WEEK.map((day) => {
    const existing = hours.find((h) => h.dayOfWeek === day.value);
    return {
      dayOfWeek: day.value,
      openTime: existing?.openTime ?? DEFAULT_HOURS[day.value].openTime,
      closeTime: existing?.closeTime ?? DEFAULT_HOURS[day.value].closeTime,
      isClosed: existing?.isClosed ?? DEFAULT_HOURS[day.value].isClosed,
    };
  });

  const [schedule, setSchedule] = useState(initialState);

  const update = (dayOfWeek: number, field: "openTime" | "closeTime" | "isClosed", value: string | boolean) => {
    setSchedule((prev) =>
      prev.map((h) => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h)
    );
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/business/hours`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: schedule }),
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Hours saved", variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Failed to save hours", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      {schedule.map((h) => {
        const day = DAYS_OF_WEEK.find((d) => d.value === h.dayOfWeek)!;
        return (
          <div
            key={h.dayOfWeek}
            className={`flex items-center gap-4 p-3 rounded-lg border ${h.isClosed ? "bg-muted/40 border-border/50" : "border-border bg-background"}`}
          >
            <div className="w-24 shrink-0">
              <span className={`text-sm font-medium ${h.isClosed ? "text-muted-foreground" : "text-foreground"}`}>
                {day.label}
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!h.isClosed}
                onChange={(e) => update(h.dayOfWeek, "isClosed", !e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary"
              />
              <span className="text-xs text-muted-foreground">Open</span>
            </label>

            {!h.isClosed ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={h.openTime}
                  onChange={(e) => update(h.dayOfWeek, "openTime", e.target.value)}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <input
                  type="time"
                  value={h.closeTime}
                  onChange={(e) => update(h.dayOfWeek, "closeTime", e.target.value)}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground flex-1">Closed</span>
            )}
          </div>
        );
      })}

      <div className="pt-2">
        <Button onClick={save} loading={saving} variant="default">Save Hours</Button>
      </div>
    </div>
  );
}
