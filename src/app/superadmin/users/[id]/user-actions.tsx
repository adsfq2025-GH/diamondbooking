"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/use-toast";

export function UserActions({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const setActive = async (next: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        toast({ variant: "destructive", title: "Update failed", description: json.error ?? "Please try again" });
        return;
      }
      toast({ variant: "success", title: next ? "User enabled" : "User disabled" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {isActive ? (
        <button
          onClick={() => setActive(false)}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
        >
          Disable
        </button>
      ) : (
        <button
          onClick={() => setActive(true)}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
        >
          Enable
        </button>
      )}
    </div>
  );
}

