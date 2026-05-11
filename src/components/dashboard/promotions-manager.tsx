"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

type Promo = {
  id: string;
  name: string;
  code: string | null;
  type: "PERCENT" | "FIXED";
  percentOff: number | null;
  amountOff: string | null;
  isActive: boolean;
  usageCount: number;
};

export function PromotionsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [promos, setPromos] = useState<Promo[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [percentOff, setPercentOff] = useState(10);
  const [amountOff, setAmountOff] = useState(10);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/promotions");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load promotions");
      setPromos(json.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code: code.trim() || undefined,
          type,
          percentOff: type === "PERCENT" ? percentOff : undefined,
          amountOff: type === "FIXED" ? amountOff : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create promotion");
      setName("");
      setCode("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create promotion");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    setError("");
    try {
      const res = await fetch(`/api/promotions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update promotion");
      setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: json.data.isActive } : p)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update promotion");
    }
  };

  const remove = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete promotion");
      setPromos((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete promotion");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Promotion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Code (optional)" value={code} onChange={(e) => setCode(e.target.value)} />
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}
            >
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed</option>
            </Select>
            {type === "PERCENT" ? (
              <Input
                placeholder="% off"
                type="number"
                min={1}
                max={100}
                value={percentOff}
                onChange={(e) => setPercentOff(Number(e.target.value))}
              />
            ) : (
              <Input
                placeholder="Amount off"
                type="number"
                min={0.01}
                value={amountOff}
                onChange={(e) => setAmountOff(Number(e.target.value))}
              />
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="gold" onClick={create} disabled={saving || !name.trim()}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Promotions</CardTitle>
          <Button variant="secondary" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : promos.length === 0 ? (
            <div className="text-sm text-muted-foreground">No promotions yet.</div>
          ) : (
            <div className="space-y-2">
              {promos.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{p.name}</p>
                      <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Active" : "Paused"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.code ? `Code: ${p.code}` : "Auto-applied"} • {p.type === "PERCENT" ? `${p.percentOff}% off` : `$${p.amountOff} off`} • Used {p.usageCount}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" onClick={() => toggle(p.id, p.isActive)}>
                      {p.isActive ? "Pause" : "Activate"}
                    </Button>
                    <Button variant="destructive" onClick={() => remove(p.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
