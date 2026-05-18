"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteStaffPortalButton({ staffId }: { staffId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const invite = async () => {
    setError("");
    setDone(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/invite`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not send invite");
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={invite} loading={loading}>
        Invite to Staff Portal
      </Button>
      {done && <span className="text-xs text-muted-foreground">Invite sent</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

