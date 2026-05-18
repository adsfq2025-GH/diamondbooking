// src/components/booking/booking-flow.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, Clock, DollarSign, User, ChevronLeft, Check, Calendar, CheckCircle2 } from "lucide-react";
import { formatTimeDisplay } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BusinessHour { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }

interface BusinessData {
  id: string; name: string; slug: string;
  description: string | null; logoUrl: string | null; coverImageUrl: string | null;
  primaryColor: string; welcomeMessage: string | null;
  phone: string | null; email: string | null; timezone: string; currency: string;
  advanceBookingDays: number; minimumNoticeHours: number;
  autoConfirm: boolean; cancellationPolicy: string | null;
  businessHours: BusinessHour[];
}

interface StaffMember { id: string; name: string; avatarUrl: string | null }

interface ServiceData {
  id: string; name: string; description: string | null;
  duration: number; price: number; currency: string; color: string;
  staff: StaffMember[];
}

interface SlotData { startTime: string; endTime: string; startUTC: string; endUTC: string; staffId: string; staffName: string }

type Step = 1 | 2 | 3 | 4 | 5;

interface BookingSelection {
  service: ServiceData | null;
  staff:   StaffMember | null;
  date:    string;
  slot:    SlotData | null;
  name:    string; email: string; phone: string; notes: string;
}

type BookingConfig = {
  addOns?: Array<{ key: string; name: string; price: number; extraMinutes?: number }>;
  intakeFields?: Array<{
    key: string;
    label: string;
    type: "text" | "number" | "select" | "boolean";
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  customerTypes?: {
    enabled: boolean;
    options: Array<"residential" | "commercial">;
  };
  recurring?: {
    enabled: boolean;
    intervals: Array<{ key: string; label: string; discountPercent: number }>;
  };
};

type Quote = {
  currency: string;
  subtotal: number;
  discounts: number;
  total: number;
  breakdown: Array<{ label: string; amount: number }>;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BookingFlow({ business, services, config }: { business: BusinessData; services: ServiceData[]; config: unknown }) {
  const primary = business.primaryColor || "#1a1f36";
  const cfg = (config ?? {}) as BookingConfig;
  const intakeFields = (cfg.intakeFields ?? []).filter((f) => f.key !== "customerType");
  const addOns = cfg.addOns ?? [];
  const recurring = cfg.recurring?.enabled ? cfg.recurring : undefined;
  const customerTypes = cfg.customerTypes?.enabled ? cfg.customerTypes : undefined;

  const [step, setStep]       = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots]     = useState<SlotData[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingId, setBookingId]       = useState<string | null>(null);
  const [error, setError]     = useState("");

  const [intake, setIntake] = useState<Record<string, unknown>>({});
  const [addOnKeys, setAddOnKeys] = useState<string[]>([]);
  const [isCommercial, setIsCommercial] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<string>("");
  const [promoCode, setPromoCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const [sel, setSel] = useState<BookingSelection>({
    service: null, staff: null, date: "", slot: null,
    name: "", email: "", phone: "", notes: "",
  });

  // Load slots when date + service + staff are selected
  const loadSlots = useCallback(async (date: string, serviceId: string, staffId: string) => {
    setSlotsLoading(true);
    try {
      const res = await fetch(
        `/api/public/availability/${business.slug}?date=${date}&serviceId=${serviceId}&staffId=${staffId}`
      );
      const json = await res.json();
      setSlots(json.data ?? []);
    } finally {
      setSlotsLoading(false);
    }
  }, [business.slug]);

  useEffect(() => {
    if (sel.date && sel.service && step === 3) {
      loadSlots(sel.date, sel.service.id, sel.staff?.id ?? "any");
    }
  }, [sel.date, sel.service, sel.staff, step, loadSlots]);

  // Check if a date is available (within business hours, not in past, within advance window)
  const isDateAvailable = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today.getTime() + business.advanceBookingDays * 86400000);
    if (d < today || d > maxDate) return false;
    const dow = d.getDay();
    const hours = business.businessHours.find((h) => h.dayOfWeek === dow);
    return hours ? !hours.isClosed : false;
  };

  const submit = async () => {
    if (!sel.service || !sel.slot || !sel.name || !sel.email) {
      setError("Please fill in all required fields"); return;
    }
    const serviceId = sel.service.id;
    const slot = sel.slot;
    setError(""); setLoading(true);
    try {
      const res = await fetch(`/api/public/book/${business.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          staffId:       slot.staffId,
          date:          sel.date,
          startTime:     slot.startUTC,
          endTime:       slot.endUTC,
          customerName:  sel.name,
          customerEmail: sel.email,
          customerPhone: sel.phone || undefined,
          notes:         sel.notes || undefined,
          intake,
          addOnKeys,
          isCommercial,
          recurringInterval: recurringInterval || undefined,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Booking failed");
      setBookingId(json.data.bookingId);
      setStep(5);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sel.service) return;
    const serviceId = sel.service.id;
    const controller = new AbortController();
    const load = async () => {
      setQuoteLoading(true);
      try {
        const res = await fetch(`/api/public/quote/${business.slug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId,
            intake,
            addOnKeys,
            isCommercial,
            recurringInterval: recurringInterval || undefined,
            promoCode: promoCode.trim() || undefined,
            customerEmail: sel.email || undefined,
          }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (res.ok) setQuote(json.data);
      } finally {
        setQuoteLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [sel.service, sel.email, business.slug, intake, addOnKeys, isCommercial, recurringInterval, promoCode]);

  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all"
            + ` focus:ring-[${primary}]/20`;

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Business header ─────────────────────────────────────────────── */}
      <div className="relative" style={{ background: primary }}>
        {business.coverImageUrl && (
          <div className="absolute inset-0 opacity-20">
            <Image src={business.coverImageUrl} alt="" fill className="object-cover" />
          </div>
        )}
        <div className="relative max-w-lg mx-auto px-6 py-8 text-center">
          {business.logoUrl ? (
            <Image src={business.logoUrl} alt={business.name} width={56} height={56}
              className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 ring-4 ring-white/20" />
          ) : (
            <Image
              src="/brand/logohead.webp"
              alt="Diamond Booking"
              width={56}
              height={56}
              className="w-14 h-14 rounded-2xl object-contain mx-auto mb-3 ring-4 ring-white/20"
            />
          )}
          <h1 className="text-xl font-bold text-white">{business.name}</h1>
          {business.welcomeMessage && (
            <p className="text-sm text-white/70 mt-1">{business.welcomeMessage}</p>
          )}
        </div>
      </div>

      {/* ── Step indicator ──────────────────────────────────────────────── */}
      {step < 5 && (
        <div className="max-w-lg mx-auto px-6">
          <div className="flex items-center justify-center gap-2 py-5">
            {(["Service","Staff","Date & Time","Details"] as const).map((label, i) => {
              const n = (i + 1) as Step;
              const done   = step > n;
              const active = step === n;
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done   ? "text-white"
                        : active ? "text-white"
                        : "bg-white border-2 border-gray-200 text-gray-400"
                      }`}
                      style={done || active ? { background: primary } : {}}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : n}
                    </div>
                    <span className={`text-[10px] font-semibold hidden sm:block ${active ? "text-gray-700" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </div>
                  {i < 3 && <div className={`w-6 h-0.5 rounded-full mb-4 ${done ? "" : "bg-gray-200"}`} style={done ? { background: primary } : {}} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-6 pb-12">

        {/* STEP 1 — Select service */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Choose a service</h2>
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSel((p) => ({ ...p, service: s, staff: s.staff.length === 1 ? s.staff[0] : null }));
                  setIntake({});
                  setAddOnKeys([]);
                  setIsCommercial(false);
                  setRecurringInterval("");
                  setPromoCode("");
                  setQuote(null);
                  setStep(2);
                }}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-gray-300 transition-all text-left group"
              >
                <div className="w-3 h-10 rounded-full shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  {s.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{s.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />{s.duration} min
                    </span>
                    {s.price > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: primary }}>
                        <DollarSign className="w-3 h-3" />{formatCurrency(s.price, s.currency)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 — Select staff */}
        {step === 2 && sel.service && (
          <div className="space-y-3">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Choose a team member</h2>

            {/* "Any available" option */}
            <button
              onClick={() => { setSel((p) => ({ ...p, staff: null })); setStep(3); }}
              className={`w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 transition-all text-left ${
                sel.staff === null ? "border-2" : "border-gray-100 hover:border-gray-300"
              }`}
              style={sel.staff === null ? { borderColor: primary } : {}}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Any available</p>
                <p className="text-xs text-gray-400">First available team member</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>

            {sel.service.staff.map((member) => (
              <button
                key={member.id}
                onClick={() => { setSel((p) => ({ ...p, staff: member })); setStep(3); }}
                className={`w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 transition-all text-left ${
                  sel.staff?.id === member.id ? "border-2" : "border-gray-100 hover:border-gray-300"
                }`}
                style={sel.staff?.id === member.id ? { borderColor: primary } : {}}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-sm font-bold text-gray-600">
                  {member.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{member.name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* STEP 3 — Pick date & time */}
        {step === 3 && sel.service && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-lg font-bold text-gray-800">Pick a date & time</h2>

            {/* Calendar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => { if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); } else setCalMonth((m) => m - 1); }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <p className="text-sm font-bold text-gray-800">{MONTHS[calMonth]} {calYear}</p>
                <button
                  onClick={() => { if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); } else setCalMonth((m) => m + 1); }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => i + 1).map((day) => {
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const avail   = isDateAvailable(calYear, calMonth, day);
                  const selected = sel.date === dateStr;
                  return (
                    <button
                      key={day}
                      disabled={!avail}
                      onClick={() => { setSel((p) => ({ ...p, date: dateStr, slot: null })); }}
                      className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                        selected
                          ? "text-white font-bold"
                          : avail
                          ? "text-gray-700 hover:bg-gray-100"
                          : "text-gray-300 cursor-not-allowed"
                      }`}
                      style={selected ? { background: primary } : {}}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            {sel.date && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(sel.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                {slotsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No availability on this date</p>
                    <p className="text-xs text-gray-400 mt-1">Please try another day</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={`${slot.startUTC}-${slot.staffId}`}
                        onClick={() => { setSel((p) => ({ ...p, slot })); setStep(4); }}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          sel.slot?.startUTC === slot.startUTC && sel.slot?.staffId === slot.staffId
                            ? "text-white border-transparent"
                            : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                        }`}
                        style={
                          sel.slot?.startUTC === slot.startUTC && sel.slot?.staffId === slot.staffId
                            ? { background: primary }
                            : {}
                        }
                      >
                        {formatTimeDisplay(slot.startTime)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Enter details */}
        {step === 4 && sel.service && sel.slot && (
          <div className="space-y-4">
            <button onClick={() => setStep(3)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-lg font-bold text-gray-800">Your details</h2>

            {/* Booking summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Booking Summary</p>
              {[
                ["Service",     sel.service.name],
                ["With",        sel.slot.staffName],
                ["Date",        new Date(sel.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })],
                ["Time",        formatTimeDisplay(sel.slot.startTime)],
                ["Duration",    `${sel.service.duration} min`],
                ...(sel.service.price > 0 ? [["Total", quote ? formatCurrency(quote.total, quote.currency) : formatCurrency(sel.service.price, sel.service.currency)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            {(customerTypes || intakeFields.length > 0 || addOns.length > 0 || recurring) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Service Options</p>

                {customerTypes && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Type</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setIsCommercial(false); setIntake((p) => ({ ...p, customerType: "residential" })); }}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${!isCommercial ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"}`}
                        style={!isCommercial ? { background: primary } : {}}
                      >
                        Residential
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsCommercial(true); setIntake((p) => ({ ...p, customerType: "commercial" })); }}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${isCommercial ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"}`}
                        style={isCommercial ? { background: primary } : {}}
                      >
                        Commercial
                      </button>
                    </div>
                  </div>
                )}

                {intakeFields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {field.label}{field.required ? " *" : ""}
                    </label>
                    {field.type === "text" && (
                      <input
                        className={inp}
                        value={String(intake[field.key] ?? "")}
                        onChange={(e) => setIntake((p) => ({ ...p, [field.key]: e.target.value }))}
                      />
                    )}
                    {field.type === "number" && (
                      <input
                        className={inp}
                        type="number"
                        min={0}
                        value={String(intake[field.key] ?? "")}
                        onChange={(e) => setIntake((p) => ({ ...p, [field.key]: e.target.value === "" ? "" : Number(e.target.value) }))}
                      />
                    )}
                    {field.type === "boolean" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setIntake((p) => ({ ...p, [field.key]: true }))}
                          className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                            intake[field.key] === true ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                          }`}
                          style={intake[field.key] === true ? { background: primary } : {}}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIntake((p) => ({ ...p, [field.key]: false }))}
                          className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                            intake[field.key] === false ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                          }`}
                          style={intake[field.key] === false ? { background: primary } : {}}
                        >
                          No
                        </button>
                      </div>
                    )}
                    {field.type === "select" && (
                      <select
                        className={inp}
                        value={String(intake[field.key] ?? "")}
                        onChange={(e) => setIntake((p) => ({ ...p, [field.key]: e.target.value }))}
                      >
                        <option value="">Select…</option>
                        {(field.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                {addOns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Add-ons</p>
                    <div className="space-y-2">
                      {addOns.map((a) => {
                        const checked = addOnKeys.includes(a.key);
                        return (
                          <button
                            key={a.key}
                            type="button"
                            onClick={() =>
                              setAddOnKeys((prev) =>
                                prev.includes(a.key) ? prev.filter((k) => k !== a.key) : [...prev, a.key]
                              )
                            }
                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                              checked ? "border-transparent text-white" : "border-gray-200 bg-white hover:border-gray-400"
                            }`}
                            style={checked ? { background: primary } : {}}
                          >
                            <span className="text-sm font-semibold">{a.name}</span>
                            <span className={`text-sm font-bold ${checked ? "text-white" : ""}`}>
                              +{formatCurrency(a.price, quote?.currency ?? business.currency)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {recurring && recurring.intervals.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recurring</label>
                    <select
                      className={inp}
                      value={recurringInterval}
                      onChange={(e) => setRecurringInterval(e.target.value)}
                    >
                      <option value="">One-time</option>
                      {recurring.intervals.map((i) => (
                        <option key={i.key} value={i.key}>
                          {i.label} ({i.discountPercent}% off)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Promo Code</label>
                  <input className={inp} value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Optional" />
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-700">Total</p>
                    <p className="text-sm font-black" style={{ color: primary }}>
                      {quoteLoading ? "Calculating…" : quote ? formatCurrency(quote.total, quote.currency) : formatCurrency(sel.service.price, sel.service.currency)}
                    </p>
                  </div>
                  {!!quote?.breakdown?.length && (
                    <div className="space-y-1">
                      {quote.breakdown.map((line) => (
                        <div key={line.label} className="flex justify-between text-xs text-gray-500">
                          <span className="truncate pr-2">{line.label}</span>
                          <span className={line.amount < 0 ? "text-emerald-600 font-semibold" : "text-gray-700"}>
                            {formatCurrency(line.amount, quote.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-3">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name *</label>
                <input className={inp} placeholder="Jane Smith"
                  value={sel.name} onChange={(e) => setSel((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address *</label>
                <input className={inp} type="email" placeholder="you@example.com"
                  value={sel.email} onChange={(e) => setSel((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone <span className="font-normal normal-case">(optional)</span></label>
                <input className={inp} type="tel" placeholder="+1 (555) 000-0000"
                  value={sel.phone} onChange={(e) => setSel((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes <span className="font-normal normal-case">(optional)</span></label>
                <textarea className={`${inp} resize-none`} rows={3}
                  placeholder="Anything the business should know..."
                  value={sel.notes} onChange={(e) => setSel((p) => ({ ...p, notes: e.target.value }))} />
              </div>

              {business.cancellationPolicy && (
                <p className="text-xs text-gray-400 leading-relaxed">{business.cancellationPolicy}</p>
              )}

              <button
                onClick={submit}
                disabled={loading || !sel.name || !sel.email}
                className="w-full py-3.5 font-bold text-white rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: primary }}
              >
                {loading ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg> Confirming...</>
                ) : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — Success */}
        {step === 5 && sel.service && sel.slot && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: `${primary}18` }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: primary }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">You&apos;re all booked!</h2>
            <p className="text-gray-500 mb-6">
              A confirmation has been sent to <strong>{sel.email}</strong>
            </p>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left mb-6 space-y-2">
              {[
                ["Service",  sel.service.name],
                ["With",     sel.slot.staffName],
                ["Date",     new Date(sel.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })],
                ["Time",     formatTimeDisplay(sel.slot.startTime)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setSel({ service: null, staff: null, date: "", slot: null, name: "", email: "", phone: "", notes: "" });
                setIntake({});
                setAddOnKeys([]);
                setIsCommercial(false);
                setRecurringInterval("");
                setPromoCode("");
                setQuote(null);
                setStep(1);
              }}
              className="text-sm font-semibold underline text-gray-500 hover:text-gray-700"
            >
              Book another appointment
            </button>
          </div>
        )}
      </div>

      {/* ── Powered by ─────────────────────────────────────────────────── */}
      <div className="text-center pb-8">
        <p className="text-xs text-gray-400">
          Powered by <Link href="/" className="font-semibold hover:underline">Diamond Booking</Link>
        </p>
      </div>
    </div>
  );
}
