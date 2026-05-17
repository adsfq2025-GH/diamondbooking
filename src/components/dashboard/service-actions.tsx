// src/components/dashboard/service-actions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, EyeOff } from "lucide-react";
import Link from "next/link";

interface ServiceActionsProps {
  serviceId: string;
  businessId: string;
}

export function ServiceActions({ serviceId }: ServiceActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async (isActive: boolean) => {
    setLoading(true);
    await fetch(`/api/services/${serviceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    router.refresh();
    setLoading(false);
    setOpen(false);
  };

  const remove = async () => {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    setLoading(true);
    await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  };

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
            <Link
              href={`/dashboard/services/${serviceId}/edit`}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Service
            </Link>
            <button
              onClick={() => toggle(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <EyeOff className="w-3.5 h-3.5" /> Hide from Booking
            </button>
            <button
              onClick={remove}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
