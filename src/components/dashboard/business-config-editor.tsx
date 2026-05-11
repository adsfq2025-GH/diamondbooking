"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ConfigResponse = {
  industryKey: string;
  config: unknown;
  pricingVersion: number;
  updatedAt: string;
} | null;

export function BusinessConfigEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ConfigResponse>(null);
  const [draft, setDraft] = useState("");

  const parsedDraft = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(draft) as unknown };
    } catch (e: unknown) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Invalid JSON" };
    }
  }, [draft]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/business/config");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load config");
        setData(json.data);
        setDraft(JSON.stringify(json.data?.config ?? {}, null, 2));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load config");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const save = async () => {
    if (!parsedDraft.ok) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/business/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: parsedDraft.value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save config");
      setData(json.data);
      setDraft(JSON.stringify(json.data?.config ?? {}, null, 2));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Industry Config</CardTitle>
          <p className="text-sm text-muted-foreground">
            Controls booking intake fields, add-ons, recurring options, and pricing rules.
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">v{data.pricingVersion}</Badge>
            <Badge variant="outline">{data.industryKey}</Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <div className="text-sm text-destructive">{error}</div>}
        <textarea
          className="w-full min-h-[380px] font-mono text-xs rounded-lg border border-border bg-background p-3"
          value={loading ? "Loading..." : draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={loading || saving}
        />
        {!parsedDraft.ok && !loading && (
          <div className="text-xs text-destructive">JSON error: {parsedDraft.error}</div>
        )}
        <div className="flex justify-end">
          <Button onClick={save} disabled={loading || saving || !parsedDraft.ok} variant="gold">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

