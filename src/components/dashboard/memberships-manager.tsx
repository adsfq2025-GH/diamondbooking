"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

type Plan = {
  id: string;
  name: string;
  interval: "MONTHLY" | "YEARLY";
  price: string;
  currency: string;
  discountPercent: number;
  priorityBooking: boolean;
  isActive: boolean;
};

export function MembershipsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);

  const [name, setName] = useState("");
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [price, setPrice] = useState(29);
  const [discountPercent, setDiscountPercent] = useState(10);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/memberships/plans");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load plans");
      setPlans(json.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load plans");
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
      const res = await fetch("/api/memberships/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, interval, price, discountPercent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create plan");
      setName("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create plan");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    setError("");
    try {
      const res = await fetch(`/api/memberships/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update plan");
      setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: json.data.isActive } : p)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update plan");
    }
  };

  const remove = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/memberships/plans/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete plan");
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete plan");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Membership Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Select
              value={interval}
              onChange={(e) => setInterval(e.target.value as "MONTHLY" | "YEARLY")}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </Select>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            <Input type="number" min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} />
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
          <CardTitle>Membership Plans</CardTitle>
          <Button variant="secondary" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="text-sm text-muted-foreground">No membership plans yet.</div>
          ) : (
            <div className="space-y-2">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{p.name}</p>
                      <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Active" : "Paused"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.interval} • {p.currency} {p.price} • {p.discountPercent}% off bookings
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
