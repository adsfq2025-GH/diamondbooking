"use client";

import { useEffect, useMemo, useState } from "react";
import { ADDON_ICON_OPTIONS, inferAddOnIconId } from "@/lib/addon-icons";

type AddOn = { key: string; name: string; price: number; extraMinutes?: number; iconId?: string };
type IntakeField = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  pricing?:
    | { type: "perUnit"; unitPrice: number }
    | { type: "choicePrice"; prices: Record<string, number> };
};

type Config = {
  addOns?: AddOn[];
  intakeFields?: IntakeField[];
  customerTypes?: {
    enabled: boolean;
    options: Array<"residential" | "commercial">;
    commercialMultiplier?: number;
  };
  recurring?: {
    enabled: boolean;
    intervals: Array<{ key: string; label: string; discountPercent: number }>;
  };
};

type ConfigResponse = {
  industryKey: string;
  config: unknown;
  pricingVersion: number;
  updatedAt: string;
} | null;

const emptyField = (): IntakeField => ({
  key: "",
  label: "",
  type: "text",
  required: false,
});

const emptyAddOn = (): AddOn => ({
  key: "",
  name: "",
  price: 0,
  iconId: undefined,
});

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

export function PricingBuilder() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<Pick<NonNullable<ConfigResponse>, "industryKey" | "pricingVersion"> | null>(null);
  const [cfg, setCfg] = useState<Config>({});

  const safeCfg = useMemo(() => {
    const raw =
      cfg && typeof cfg === "object" && !Array.isArray(cfg) ? (cfg as Record<string, unknown>) : {};

    const base: Config & Record<string, unknown> = {
      ...raw,
      addOns: Array.isArray(cfg.addOns) ? cfg.addOns : [],
      intakeFields: Array.isArray(cfg.intakeFields) ? cfg.intakeFields : [],
      customerTypes: cfg.customerTypes ?? { enabled: false, options: ["residential", "commercial"], commercialMultiplier: 1.2 },
      recurring: cfg.recurring ?? { enabled: false, intervals: [] },
    };
    return base;
  }, [cfg]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/business/config");
        const json = (await readJson(res)) as { error?: string; data?: unknown };
        if (!res.ok) throw new Error(json.error ?? "Failed to load config");
        const data = (json.data ?? null) as ConfigResponse;
        setMeta(data ? { industryKey: data.industryKey, pricingVersion: data.pricingVersion } : null);
        setCfg((data?.config ?? {}) as Config);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load config");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/business/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: safeCfg }),
      });
      const json = (await readJson(res)) as { error?: string; data?: unknown };
      if (!res.ok) throw new Error(json.error ?? "Failed to save config");
      const data = (json.data ?? null) as ConfigResponse;
      setMeta(data ? { industryKey: data.industryKey, pricingVersion: data.pricingVersion } : null);
      setCfg((data?.config ?? {}) as Config);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold font-heading">Pricing Builder</h3>
          <p className="text-sm text-muted-foreground">
            Configure booking intake fields, add-ons, recurring options, and commercial pricing.
          </p>
        </div>
        {meta && (
          <div className="text-xs text-muted-foreground text-right">
            <div>Industry: {meta.industryKey}</div>
            <div>Version: v{meta.pricingVersion}</div>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Residential / Commercial</div>
            <div className="text-xs text-muted-foreground">
              Enable a customer type switch and optionally apply a commercial multiplier.
            </div>
          </div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!safeCfg.customerTypes?.enabled}
              onChange={(e) =>
                setCfg((p) => ({
                  ...p,
                  customerTypes: {
                    ...(p.customerTypes ?? { options: ["residential", "commercial"] }),
                    enabled: e.target.checked,
                  },
                }))
              }
            />
            Enabled
          </label>
        </div>

        {safeCfg.customerTypes?.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Commercial multiplier
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={safeCfg.customerTypes?.commercialMultiplier ?? 1.2}
                onChange={(e) =>
                  setCfg((p) => ({
                    ...p,
                    customerTypes: {
                      ...(p.customerTypes ?? { enabled: true, options: ["residential", "commercial"] }),
                      enabled: true,
                      commercialMultiplier: Number(e.target.value),
                    },
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Recurring Discounts</div>
            <div className="text-xs text-muted-foreground">
              Configure optional discounts for recurring bookings (monthly, weekly, etc.).
            </div>
          </div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!safeCfg.recurring?.enabled}
              onChange={(e) =>
                setCfg((p) => ({
                  ...p,
                  recurring: {
                    ...(p.recurring ?? { intervals: [] }),
                    enabled: e.target.checked,
                  },
                }))
              }
            />
            Enabled
          </label>
        </div>

        {safeCfg.recurring?.enabled && (
          <div className="space-y-2">
            {(safeCfg.recurring?.intervals ?? []).map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={it.key}
                  onChange={(e) =>
                    setCfg((p) => {
                      const intervals = [...(p.recurring?.intervals ?? [])];
                      intervals[idx] = { ...intervals[idx], key: e.target.value };
                      return { ...p, recurring: { enabled: true, intervals } };
                    })
                  }
                  placeholder="key (e.g. monthly)"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
                <input
                  value={it.label}
                  onChange={(e) =>
                    setCfg((p) => {
                      const intervals = [...(p.recurring?.intervals ?? [])];
                      intervals[idx] = { ...intervals[idx], label: e.target.value };
                      return { ...p, recurring: { enabled: true, intervals } };
                    })
                  }
                  placeholder="Label"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={it.discountPercent}
                    onChange={(e) =>
                      setCfg((p) => {
                        const intervals = [...(p.recurring?.intervals ?? [])];
                        intervals[idx] = { ...intervals[idx], discountPercent: Number(e.target.value) };
                        return { ...p, recurring: { enabled: true, intervals } };
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted"
                    onClick={() =>
                      setCfg((p) => {
                        const intervals = [...(p.recurring?.intervals ?? [])];
                        intervals.splice(idx, 1);
                        return { ...p, recurring: { enabled: true, intervals } };
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
              onClick={() =>
                setCfg((p) => ({
                  ...p,
                  recurring: {
                    enabled: true,
                    intervals: [...(p.recurring?.intervals ?? []), { key: "", label: "", discountPercent: 0 }],
                  },
                }))
              }
            >
              Add interval
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold">Add-ons</div>
          <div className="text-xs text-muted-foreground">Optional add-ons shown on the booking widget.</div>
        </div>

        <div className="space-y-2">
          {(safeCfg.addOns ?? []).map((a, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <input
                value={a.key}
                onChange={(e) =>
                  setCfg((p) => {
                    const addOns = [...(p.addOns ?? [])];
                    addOns[idx] = { ...addOns[idx], key: e.target.value };
                    return { ...p, addOns };
                  })
                }
                placeholder="key (e.g. inside_fridge)"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
              <input
                value={a.name}
                onChange={(e) =>
                  setCfg((p) => {
                    const addOns = [...(p.addOns ?? [])];
                    const existing = addOns[idx] ?? emptyAddOn();
                    const nextName = e.target.value;
                    const nextIcon = existing.iconId ? existing.iconId : inferAddOnIconId(nextName);
                    addOns[idx] = { ...existing, name: nextName, ...(nextIcon ? { iconId: nextIcon } : {}) };
                    return { ...p, addOns };
                  })
                }
                placeholder="Name"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={a.price}
                onChange={(e) =>
                  setCfg((p) => {
                    const addOns = [...(p.addOns ?? [])];
                    addOns[idx] = { ...addOns[idx], price: Number(e.target.value) };
                    return { ...p, addOns };
                  })
                }
                placeholder="Price"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
              <select
                value={a.iconId ?? ""}
                onChange={(e) =>
                  setCfg((p) => {
                    const addOns = [...(p.addOns ?? [])];
                    const next = e.target.value.trim();
                    addOns[idx] = { ...addOns[idx], iconId: next || undefined };
                    return { ...p, addOns };
                  })
                }
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              >
                <option value="">Auto</option>
                {ADDON_ICON_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={a.extraMinutes ?? 0}
                  onChange={(e) =>
                    setCfg((p) => {
                      const addOns = [...(p.addOns ?? [])];
                      addOns[idx] = { ...addOns[idx], extraMinutes: Number(e.target.value) || undefined };
                      return { ...p, addOns };
                    })
                  }
                  placeholder="Extra min"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
                <button
                  type="button"
                  className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted"
                  onClick={() =>
                    setCfg((p) => {
                      const addOns = [...(p.addOns ?? [])];
                      addOns.splice(idx, 1);
                      return { ...p, addOns };
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
            onClick={() => setCfg((p) => ({ ...p, addOns: [...(p.addOns ?? []), emptyAddOn()] }))}
          >
            Add add-on
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold">Customer Intake Fields</div>
          <div className="text-xs text-muted-foreground">Questions shown during booking, with optional pricing rules.</div>
        </div>

        <div className="space-y-4">
          {(safeCfg.intakeFields ?? []).map((f, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-background p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  value={f.key}
                  onChange={(e) =>
                    setCfg((p) => {
                      const intakeFields = [...(p.intakeFields ?? [])];
                      intakeFields[idx] = { ...intakeFields[idx], key: e.target.value };
                      return { ...p, intakeFields };
                    })
                  }
                  placeholder="key (e.g. bedrooms)"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
                <input
                  value={f.label}
                  onChange={(e) =>
                    setCfg((p) => {
                      const intakeFields = [...(p.intakeFields ?? [])];
                      intakeFields[idx] = { ...intakeFields[idx], label: e.target.value };
                      return { ...p, intakeFields };
                    })
                  }
                  placeholder="Label"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
                <select
                  value={f.type}
                  onChange={(e) =>
                    setCfg((p) => {
                      const intakeFields = [...(p.intakeFields ?? [])];
                      intakeFields[idx] = { ...intakeFields[idx], type: e.target.value as IntakeField["type"] };
                      return { ...p, intakeFields };
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="boolean">Yes/No</option>
                </select>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!f.required}
                      onChange={(e) =>
                        setCfg((p) => {
                          const intakeFields = [...(p.intakeFields ?? [])];
                          intakeFields[idx] = { ...intakeFields[idx], required: e.target.checked };
                          return { ...p, intakeFields };
                        })
                      }
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted"
                    onClick={() =>
                      setCfg((p) => {
                        const intakeFields = [...(p.intakeFields ?? [])];
                        intakeFields.splice(idx, 1);
                        return { ...p, intakeFields };
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>

              {f.type === "select" && (
                <SelectOptionsEditor
                  options={f.options ?? []}
                  onChange={(options) =>
                    setCfg((p) => {
                      const intakeFields = [...(p.intakeFields ?? [])];
                      intakeFields[idx] = { ...intakeFields[idx], options };
                      return { ...p, intakeFields };
                    })
                  }
                />
              )}

              <PricingRuleEditor
                field={f}
                onChange={(pricing) =>
                  setCfg((p) => {
                    const intakeFields = [...(p.intakeFields ?? [])];
                    intakeFields[idx] = { ...intakeFields[idx], pricing };
                    return { ...p, intakeFields };
                  })
                }
              />
            </div>
          ))}

          <button
            type="button"
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
            onClick={() => setCfg((p) => ({ ...p, intakeFields: [...(p.intakeFields ?? []), emptyField()] }))}
          >
            Add field
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save Pricing Config"}
        </button>
      </div>
    </div>
  );
}

function SelectOptionsEditor({
  options,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  onChange: (next: Array<{ value: string; label: string }>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Options</div>
      {options.map((o, idx) => (
        <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            value={o.value}
            onChange={(e) => {
              const next = [...options];
              next[idx] = { ...next[idx], value: e.target.value };
              onChange(next);
            }}
            placeholder="value"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
          />
          <input
            value={o.label}
            onChange={(e) => {
              const next = [...options];
              next[idx] = { ...next[idx], label: e.target.value };
              onChange(next);
            }}
            placeholder="label"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
          />
          <button
            type="button"
            className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted"
            onClick={() => {
              const next = [...options];
              next.splice(idx, 1);
              onChange(next);
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
        onClick={() => onChange([...options, { value: "", label: "" }])}
      >
        Add option
      </button>
    </div>
  );
}

function PricingRuleEditor({
  field,
  onChange,
}: {
  field: IntakeField;
  onChange: (pricing: IntakeField["pricing"] | undefined) => void;
}) {
  const kind = field.pricing?.type ?? "none";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">Pricing rule</div>
        <select
          value={kind}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "none") return onChange(undefined);
            if (v === "perUnit") return onChange({ type: "perUnit", unitPrice: 0 });
            if (v === "choicePrice") return onChange({ type: "choicePrice", prices: {} });
          }}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
        >
          <option value="none">None</option>
          <option value="perUnit">Per unit</option>
          <option value="choicePrice">Choice pricing</option>
        </select>
      </div>

      {field.pricing?.type === "perUnit" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Unit price</label>
            <input
              type="number"
              step="0.01"
              value={field.pricing.unitPrice}
              onChange={(e) => onChange({ type: "perUnit", unitPrice: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            />
          </div>
        </div>
      )}

      {field.pricing?.type === "choicePrice" && (
        <ChoicePricingEditor
          prices={field.pricing.prices}
          options={field.options ?? []}
          onChange={(prices) => onChange({ type: "choicePrice", prices })}
        />
      )}
    </div>
  );
}

function ChoicePricingEditor({
  prices,
  options,
  onChange,
}: {
  prices: Record<string, number>;
  options: Array<{ value: string; label: string }>;
  onChange: (next: Record<string, number>) => void;
}) {
  const keys = Array.from(
    new Set([
      ...Object.keys(prices ?? {}),
      ...options.map((o) => o.value).filter(Boolean),
      "true",
      "false",
    ])
  ).filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Set an add-on price for each choice value (or leave blank/0).
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {keys.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <div className="text-xs w-24 truncate">{k}</div>
            <input
              type="number"
              step="0.01"
              value={prices?.[k] ?? 0}
              onChange={(e) => {
                const next = { ...(prices ?? {}) };
                next[k] = Number(e.target.value);
                onChange(next);
              }}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

