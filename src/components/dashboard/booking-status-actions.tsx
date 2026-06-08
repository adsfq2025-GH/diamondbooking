// src/components/dashboard/booking-status-actions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Check, X, CheckCircle2, AlertCircle } from "lucide-react";

interface BookingStatusActionsProps {
  bookingId: string;
  currentStatus: string;
}

export function BookingStatusActions({ bookingId, currentStatus }: BookingStatusActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: string) => {
    setLoading(true);
    await fetch(`/api/bookings/${bookingId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(false);
    setOpen(false);
  };

  const ACTIONS = [
    { status: "CONFIRMED", label: "Confirm", icon: Check, show: ["PENDING"] },
    { status: "COMPLETED", label: "Mark Complete", icon: CheckCircle2, show: ["CONFIRMED"] },
    { status: "NO_SHOW", label: "Mark No-Show", icon: AlertCircle, show: ["CONFIRMED", "PENDING"] },
    { status: "CANCELLED", label: "Cancel", icon: X, show: ["PENDING_PAYMENT", "PENDING", "CONFIRMED"], danger: true },
  ].filter((a) => a.show.includes(currentStatus));

  if (ACTIONS.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-8 z-20 w-44 bg-card border border-border rounded-xl shadow-lg py-1">
            {ACTIONS.map(({ status, label, icon: Icon, danger }) => (
              <button
                key={status}
                onClick={() => updateStatus(status)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                  danger
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
