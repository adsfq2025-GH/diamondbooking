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
  type: "PERCENT" | "FIXED" | "FREE_ADDON";
  percentOff: number | null;
  amountOff: string | null;
  freeAddonKey: string | null;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  appliesTo?: unknown;
  minSubtotal?: string | null;
  newCustomerOnly?: boolean;
  memberOnly?: boolean;
  stackable?: boolean;
  usageLimit?: number | null;
  usageCount: number;
};

export function PromotionsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [promos, setPromos] = useState<Promo[]>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [addOns, setAddOns] = useState<Array<{ key: string; name: string }>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED" | "FREE_ADDON">("PERCENT");
  const [percentOff, setPercentOff] = useState(10);
  const [amountOff, setAmountOff] = useState(10);
  const [freeAddonKey, setFreeAddonKey] = useState("");
  const [stackable, setStackable] = useState(false);
  const [memberOnly, setMemberOnly] = useState(false);
  const [newCustomerOnly, setNewCustomerOnly] = useState(false);
  const [usageLimit, setUsageLimit] = useState<number | "">("");
  const [minSubtotal, setMinSubtotal] = useState<number | "">("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [customerType, setCustomerType] = useState<"" | "residential" | "commercial">("");
  const [appliesServices, setAppliesServices] = useState<string[]>([]);
  const [appliesAddOns, setAppliesAddOns] = useState<string[]>([]);

  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editType, setEditType] = useState<"PERCENT" | "FIXED" | "FREE_ADDON">("PERCENT");
  const [editPercentOff, setEditPercentOff] = useState<number | "">(10);
  const [editAmountOff, setEditAmountOff] = useState<number | "">(10);
  const [editFreeAddonKey, setEditFreeAddonKey] = useState("");
  const [editStackable, setEditStackable] = useState(false);
  const [editMemberOnly, setEditMemberOnly] = useState(false);
  const [editNewCustomerOnly, setEditNewCustomerOnly] = useState(false);
  const [editUsageLimit, setEditUsageLimit] = useState<number | "">("");
  const [editMinSubtotal, setEditMinSubtotal] = useState<number | "">("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editCustomerType, setEditCustomerType] = useState<"" | "residential" | "commercial">("");
  const [editAppliesServices, setEditAppliesServices] = useState<string[]>([]);
  const [editAppliesAddOns, setEditAppliesAddOns] = useState<string[]>([]);

  const toDatetimeLocal = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const parseAppliesTo = (v: unknown) => {
    const obj = (v && typeof v === "object" ? (v as Record<string, unknown>) : {}) as Record<string, unknown>;
    const ct: "" | "residential" | "commercial" =
      obj.customerType === "residential" || obj.customerType === "commercial"
        ? (obj.customerType as "residential" | "commercial")
        : "";
    const svc = Array.isArray(obj.services) ? obj.services.filter((x): x is string => typeof x === "string") : [];
    const ao = Array.isArray(obj.addOns) ? obj.addOns.filter((x): x is string => typeof x === "string") : [];
    return { customerType: ct, services: svc, addOns: ao };
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [promoRes, servicesRes, configRes] = await Promise.all([
        fetch("/api/promotions"),
        fetch("/api/services"),
        fetch("/api/business/config"),
      ]);
      const promoJson = await promoRes.json();
      if (!promoRes.ok) throw new Error(promoJson.error ?? "Failed to load promotions");
      setPromos(promoJson.data ?? []);

      const servicesJson = await servicesRes.json();
      if (servicesRes.ok) {
        const rows = Array.isArray(servicesJson.data) ? servicesJson.data : [];
        setServices(rows.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      }

      const configJson = await configRes.json();
      if (configRes.ok) {
        const cfg = (configJson.data?.config ?? {}) as { addOns?: Array<{ key: string; name: string }> };
        const list = Array.isArray(cfg.addOns) ? cfg.addOns : [];
        setAddOns(list.map((a) => ({ key: a.key, name: a.name })));
      }
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
      const appliesTo =
        customerType || appliesServices.length || appliesAddOns.length
          ? {
              ...(customerType ? { customerType } : {}),
              ...(appliesServices.length ? { services: appliesServices } : {}),
              ...(appliesAddOns.length ? { addOns: appliesAddOns } : {}),
            }
          : undefined;

      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code: code.trim() || undefined,
          type,
          percentOff: type === "PERCENT" ? percentOff : undefined,
          amountOff: type === "FIXED" ? amountOff : undefined,
          freeAddonKey: type === "FREE_ADDON" ? freeAddonKey.trim() || undefined : undefined,
          stackable,
          memberOnly,
          newCustomerOnly,
          usageLimit: usageLimit === "" ? undefined : usageLimit,
          minSubtotal: minSubtotal === "" ? undefined : minSubtotal,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          appliesTo,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create promotion");
      setName("");
      setCode("");
      setFreeAddonKey("");
      setStackable(false);
      setMemberOnly(false);
      setNewCustomerOnly(false);
      setUsageLimit("");
      setMinSubtotal("");
      setStartsAt("");
      setEndsAt("");
      setCustomerType("");
      setAppliesServices([]);
      setAppliesAddOns([]);
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

  const startEdit = (p: Promo) => {
    const parsed = parseAppliesTo(p.appliesTo);
    setEditingId(p.id);
    setEditName(p.name ?? "");
    setEditCode(p.code ?? "");
    setEditType(p.type);
    setEditPercentOff(p.percentOff ?? 10);
    setEditAmountOff(p.amountOff ? Number(p.amountOff) : 10);
    setEditFreeAddonKey(p.freeAddonKey ?? "");
    setEditStackable(!!p.stackable);
    setEditMemberOnly(!!p.memberOnly);
    setEditNewCustomerOnly(!!p.newCustomerOnly);
    setEditUsageLimit(p.usageLimit ?? "");
    setEditMinSubtotal(p.minSubtotal ? Number(p.minSubtotal) : "");
    setEditStartsAt(toDatetimeLocal(p.startsAt));
    setEditEndsAt(toDatetimeLocal(p.endsAt));
    setEditCustomerType(parsed.customerType);
    setEditAppliesServices(parsed.services);
    setEditAppliesAddOns(parsed.addOns);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCode("");
    setEditType("PERCENT");
    setEditPercentOff(10);
    setEditAmountOff(10);
    setEditFreeAddonKey("");
    setEditStackable(false);
    setEditMemberOnly(false);
    setEditNewCustomerOnly(false);
    setEditUsageLimit("");
    setEditMinSubtotal("");
    setEditStartsAt("");
    setEditEndsAt("");
    setEditCustomerType("");
    setEditAppliesServices([]);
    setEditAppliesAddOns([]);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const appliesTo =
        editCustomerType || editAppliesServices.length || editAppliesAddOns.length
          ? {
              ...(editCustomerType ? { customerType: editCustomerType } : {}),
              ...(editAppliesServices.length ? { services: editAppliesServices } : {}),
              ...(editAppliesAddOns.length ? { addOns: editAppliesAddOns } : {}),
            }
          : {};

      const res = await fetch(`/api/promotions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          code: editCode.trim() ? editCode.trim() : null,
          type: editType,
          percentOff: editType === "PERCENT" ? (editPercentOff === "" ? null : editPercentOff) : null,
          amountOff: editType === "FIXED" ? (editAmountOff === "" ? null : editAmountOff) : null,
          freeAddonKey: editType === "FREE_ADDON" ? (editFreeAddonKey.trim() || null) : null,
          isActive: undefined,
          startsAt: editStartsAt ? new Date(editStartsAt).toISOString() : null,
          endsAt: editEndsAt ? new Date(editEndsAt).toISOString() : null,
          appliesTo,
          minSubtotal: editMinSubtotal === "" ? null : editMinSubtotal,
          newCustomerOnly: editNewCustomerOnly,
          memberOnly: editMemberOnly,
          stackable: editStackable,
          usageLimit: editUsageLimit === "" ? null : editUsageLimit,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update promotion");
      await load();
      cancelEdit();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update promotion");
    } finally {
      setSaving(false);
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
              onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED" | "FREE_ADDON")}
            >
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed</option>
              <option value="FREE_ADDON">Free add-on</option>
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
            ) : type === "FIXED" ? (
              <Input
                placeholder="Amount off"
                type="number"
                min={0.01}
                value={amountOff}
                onChange={(e) => setAmountOff(Number(e.target.value))}
              />
            ) : (
              <Select value={freeAddonKey} onChange={(e) => setFreeAddonKey(e.target.value)}>
                <option value="">Select add-on…</option>
                {addOns.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name} ({a.key})
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={stackable} onChange={(e) => setStackable(e.target.checked)} />
              <span>Stackable</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={memberOnly} onChange={(e) => setMemberOnly(e.target.checked)} />
              <span>Member-only</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newCustomerOnly}
                onChange={(e) => setNewCustomerOnly(e.target.checked)}
              />
              <span>New customers</span>
            </div>
            <Input
              placeholder="Usage limit (optional)"
              type="number"
              min={1}
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Min subtotal (optional)"
              type="number"
              min={0}
              step="0.01"
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <Input
              placeholder="Starts at (optional)"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <Input
              placeholder="Ends at (optional)"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
            <Select value={customerType} onChange={(e) => setCustomerType(e.target.value as typeof customerType)}>
              <option value="">Any customer type</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </Select>
          </div>

          {(services.length > 0 || addOns.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Applies to services (optional)</div>
                <div className="max-h-40 overflow-auto space-y-1">
                  {services.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={appliesServices.includes(s.id)}
                        onChange={(e) =>
                          setAppliesServices((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)
                          )
                        }
                      />
                      <span className="truncate">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Applies to add-ons (optional)</div>
                <div className="max-h-40 overflow-auto space-y-1">
                  {addOns.map((a) => (
                    <label key={a.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={appliesAddOns.includes(a.key)}
                        onChange={(e) =>
                          setAppliesAddOns((prev) =>
                            e.target.checked ? [...prev, a.key] : prev.filter((x) => x !== a.key)
                          )
                        }
                      />
                      <span className="truncate">{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                <div key={p.id} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{p.name}</p>
                        <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Active" : "Paused"}</Badge>
                        {p.stackable ? <Badge variant="secondary">Stackable</Badge> : null}
                        {p.memberOnly ? <Badge variant="secondary">Members</Badge> : null}
                        {p.newCustomerOnly ? <Badge variant="secondary">New</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.code ? `Code: ${p.code}` : "Auto-applied"} •{" "}
                        {p.type === "PERCENT"
                          ? `${p.percentOff}% off`
                          : p.type === "FIXED"
                            ? `$${p.amountOff} off`
                            : `Free add-on: ${p.freeAddonKey ?? ""}`}{" "}
                        • Used {p.usageCount}
                        {p.usageLimit ? ` / ${p.usageLimit}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="secondary" onClick={() => toggle(p.id, p.isActive)}>
                        {p.isActive ? "Pause" : "Activate"}
                      </Button>
                      <Button variant="secondary" onClick={() => (editingId === p.id ? cancelEdit() : startEdit(p))}>
                        {editingId === p.id ? "Close" : "Edit"}
                      </Button>
                      <Button variant="destructive" onClick={() => remove(p.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>

                  {editingId === p.id && (
                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Input placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        <Input placeholder="Code (optional)" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                        <Select value={editType} onChange={(e) => setEditType(e.target.value as typeof editType)}>
                          <option value="PERCENT">Percent</option>
                          <option value="FIXED">Fixed</option>
                          <option value="FREE_ADDON">Free add-on</option>
                        </Select>
                        {editType === "PERCENT" ? (
                          <Input
                            placeholder="% off"
                            type="number"
                            min={1}
                            max={100}
                            value={editPercentOff}
                            onChange={(e) => setEditPercentOff(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        ) : editType === "FIXED" ? (
                          <Input
                            placeholder="Amount off"
                            type="number"
                            min={0.01}
                            value={editAmountOff}
                            onChange={(e) => setEditAmountOff(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        ) : (
                          <Select value={editFreeAddonKey} onChange={(e) => setEditFreeAddonKey(e.target.value)}>
                            <option value="">Select add-on…</option>
                            {addOns.map((a) => (
                              <option key={a.key} value={a.key}>
                                {a.name} ({a.key})
                              </option>
                            ))}
                          </Select>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editStackable}
                            onChange={(e) => setEditStackable(e.target.checked)}
                          />
                          <span>Stackable</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editMemberOnly}
                            onChange={(e) => setEditMemberOnly(e.target.checked)}
                          />
                          <span>Member-only</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editNewCustomerOnly}
                            onChange={(e) => setEditNewCustomerOnly(e.target.checked)}
                          />
                          <span>New customers</span>
                        </div>
                        <Input
                          placeholder="Usage limit (optional)"
                          type="number"
                          min={1}
                          value={editUsageLimit}
                          onChange={(e) => setEditUsageLimit(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Input
                          placeholder="Min subtotal (optional)"
                          type="number"
                          min={0}
                          step="0.01"
                          value={editMinSubtotal}
                          onChange={(e) => setEditMinSubtotal(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                        <Input
                          placeholder="Starts at (optional)"
                          type="datetime-local"
                          value={editStartsAt}
                          onChange={(e) => setEditStartsAt(e.target.value)}
                        />
                        <Input
                          placeholder="Ends at (optional)"
                          type="datetime-local"
                          value={editEndsAt}
                          onChange={(e) => setEditEndsAt(e.target.value)}
                        />
                        <Select
                          value={editCustomerType}
                          onChange={(e) => setEditCustomerType(e.target.value as "" | "residential" | "commercial")}
                        >
                          <option value="">Any customer type</option>
                          <option value="residential">Residential</option>
                          <option value="commercial">Commercial</option>
                        </Select>
                      </div>

                      {(services.length > 0 || addOns.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">Applies to services (optional)</div>
                            <div className="max-h-40 overflow-auto space-y-1">
                              {services.map((s) => (
                                <label key={s.id} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={editAppliesServices.includes(s.id)}
                                    onChange={(e) =>
                                      setEditAppliesServices((prev) =>
                                        e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)
                                      )
                                    }
                                  />
                                  <span className="truncate">{s.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">Applies to add-ons (optional)</div>
                            <div className="max-h-40 overflow-auto space-y-1">
                              {addOns.map((a) => (
                                <label key={a.key} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={editAppliesAddOns.includes(a.key)}
                                    onChange={(e) =>
                                      setEditAppliesAddOns((prev) =>
                                        e.target.checked ? [...prev, a.key] : prev.filter((x) => x !== a.key)
                                      )
                                    }
                                  />
                                  <span className="truncate">{a.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </Button>
                        <Button variant="gold" onClick={() => void saveEdit()} disabled={saving || !editName.trim()}>
                          {saving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
