"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "@/lib/utils";

type Suggestion = { id: string; label: string };

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  className,
  country = "us",
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (v: { street: string; city: string; state: string; zip: string }) => void;
  className?: string;
  country?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const lastQuery = useRef("");

  const load = useMemo(
    () =>
      debounce(async (q: string) => {
        if (q.trim().length < 3) {
          setItems([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const res = await fetch(`/api/address/autocomplete?q=${encodeURIComponent(q)}&country=${encodeURIComponent(country)}`);
          const json = (await res.json()) as { success: boolean; data?: Suggestion[] };
          setItems(Array.isArray(json.data) ? json.data : []);
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
      }, 250),
    [country]
  );

  useEffect(() => {
    const q = value;
    if (q === lastQuery.current) return;
    lastQuery.current = q;
    setOpen(true);
    load(q);
  }, [value, load]);

  const choose = async (id: string) => {
    setOpen(false);
    setItems([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/address/details?id=${encodeURIComponent(id)}`);
      const json = (await res.json()) as { success: boolean; data?: { street: string; city: string; state: string; zip: string } };
      if (json?.data) {
        onSelect(json.data);
        onChange(json.data.street);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && (loading || items.length > 0) && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-500">
              Searching…
            </div>
          )}
          {!loading && items.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void choose(s.id)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

