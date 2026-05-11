// src/components/dashboard/onboarding-wizard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Building2, Clock, Scissors, Users, Palette,
  Code2, Check, Plus, Trash2, ChevronRight, ChevronDown,
  Copy, CheckCheck, Sparkles, Package,
} from "lucide-react";
import {
  generateSlug,
  INDUSTRY_OPTIONS,
  DAYS_OF_WEEK,
  DURATION_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  duration: number;
  price: string;
  color: string;
}

interface AddOn {
  id: string;
  name: string;
  price: string;
  extraMinutes: number;
}

interface DayAvail {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  availability: DayAvail[];
}

interface WidgetConfig {
  primaryColor: string;
  accentColor: string;
  borderRadius: "sharp" | "soft" | "pill";
  theme: "light" | "dark" | "auto";
  showPrices: boolean;
  showStaffAvatars: boolean;
  showLogo: boolean;
  welcomeMessage: string;
  buttonText: string;
  fontFamily: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Business", icon: Building2 },
  { n: 2, label: "Hours",    icon: Clock },
  { n: 3, label: "Services", icon: Scissors },
  { n: 4, label: "Add-ons",  icon: Package },
  { n: 5, label: "Staff",    icon: Users },
  { n: 6, label: "Widget",   icon: Palette },
  { n: 7, label: "Go Live",  icon: Code2 },
];

const SERVICE_COLORS = [
  "#1a1f36","#d4a843","#16a34a","#2563eb",
  "#9333ea","#e11d48","#ea580c","#0891b2",
];

const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";

const FONT_OPTIONS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "DM Sans",           label: "DM Sans" },
  { value: "Outfit",            label: "Outfit" },
  { value: "Sora",              label: "Sora" },
  { value: "Nunito",            label: "Nunito" },
];

const defaultAvail = (): DayAvail[] =>
  DAYS_OF_WEEK.map((d) => ({
    dayOfWeek: d.value,
    openTime: "09:00",
    closeTime: "18:00",
    isClosed: d.value === 0,
  }));

// ─── Shared sub-components ─────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
        checked ? "bg-[#1a1f36]" : "bg-gray-200"
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
          checked ? "left-4" : "left-0.5"
        }`}
      />
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  loading,
  nextLabel = "Continue",
  isLast = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  loading?: boolean;
  nextLabel?: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={loading}
        className={`flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
          isLast
            ? "bg-gradient-to-r from-[#d4a843] to-amber-400 text-[#1a1f36] hover:shadow-lg hover:shadow-amber-200"
            : "bg-[#1a1f36] text-white hover:bg-[#1a1f36]/90"
        } disabled:opacity-50`}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving...
          </>
        ) : (
          <>
            {nextLabel}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main wizard ────────────────────────────────────────────────────────────

export function OnboardingWizard({ userId: _ }: { userId: string }) {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  // Step 1
  const [bizName, setBizName]           = useState("");
  const [bizSlug, setBizSlug]           = useState("");
  const [industry, setIndustry]         = useState("generic");
  const [phone, setPhone]               = useState("");
  const [timezone, setTimezone]         = useState("America/New_York");
  const [description, setDescription]  = useState("");
  const [industryOptions, setIndustryOptions] = useState(INDUSTRY_OPTIONS);

  // Step 2
  const [hours, setHours] = useState<DayAvail[]>(defaultAvail());

  // Step 3
  const [services, setServices] = useState<Service[]>([
    { id: "s1", name: "", duration: 60, price: "", color: SERVICE_COLORS[0] },
  ]);

  // Step 4
  const [addOns, setAddOns] = useState<AddOn[]>([]);

  // Step 5
  const [staff, setStaff]               = useState<StaffMember[]>([
    { id: "m1", name: "", email: "", availability: defaultAvail() },
  ]);
  const [expandedStaff, setExpandedStaff] = useState<string | null>("m1");

  // Step 6
  const [widget, setWidget] = useState<WidgetConfig>({
    primaryColor:    "#1a1f36",
    accentColor:     "#d4a843",
    borderRadius:    "soft",
    theme:           "light",
    showPrices:      true,
    showStaffAvatars: true,
    showLogo:        true,
    welcomeMessage:  "Book your appointment online — it only takes a minute.",
    buttonText:      "Book Now",
    fontFamily:      "Plus Jakarta Sans",
  });

  // Created
  const [businessSlug, setBusinessSlug] = useState("");

  // ── helpers ────────────────────────────────────────────────────────────────

  const inp =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white " +
    "placeholder:text-gray-400 focus:outline-none focus:ring-2 " +
    "focus:ring-[#1a1f36]/20 focus:border-[#1a1f36] transition-all";

  const go = async (fn: () => Promise<void>) => {
    setError(""); setLoading(true);
    try { await fn(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/industry/templates");
        const json = await res.json();
        if (!res.ok || !Array.isArray(json.data)) return;
        setIndustryOptions(
          json.data.map((t: { key: string; name: string; category: string }) => ({
            value: t.key,
            label: `${t.name} — ${t.category}`,
          }))
        );
      } catch {
      }
    };
    void load();
  }, []);

  // ── step submitters ────────────────────────────────────────────────────────

  const submit1 = () =>
    go(async () => {
      if (!bizName.trim()) throw new Error("Business name is required");
      const slug = bizSlug || generateSlug(bizName);
      const res  = await fetch("/api/business/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: bizName, slug, industry, phone, timezone, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setBusinessSlug(json.data.slug);
      await updateSession({ businessId: json.data.id, businessSlug: json.data.slug });
      setStep(2);
    });

  const submit2 = () =>
    go(async () => {
      await fetch("/api/business/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      setStep(3);
    });

  const submit3 = () =>
    go(async () => {
      const valid = services.filter((s) => s.name.trim());
      if (!valid.length) throw new Error("Add at least one service");
      await Promise.all(
        valid.map((s) =>
          fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: s.name, duration: s.duration, price: parseFloat(s.price) || 0, color: s.color }),
          })
        )
      );
      setStep(4);
    });

  const submit4 = () =>
    go(async () => {
      const valid = addOns.filter((a) => a.name.trim());
      if (valid.length) {
        await Promise.all(
          valid.map((a) =>
            fetch("/api/services", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: a.name, duration: a.extraMinutes, price: parseFloat(a.price) || 0 }),
            })
          )
        );
      }
      setStep(5);
    });

  const submit5 = () =>
    go(async () => {
      const valid = staff.filter((s) => s.name.trim());
      if (valid.length) {
        await Promise.all(
          valid.map((s) =>
            fetch("/api/staff", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: s.name, email: s.email || undefined, availability: s.availability }),
            })
          )
        );
      }
      setStep(6);
    });

  const submit6 = () =>
    go(async () => {
      await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryColor: widget.primaryColor, welcomeMessage: widget.welcomeMessage }),
      });
      setStep(7);
    });

  const finish = () =>
    go(async () => {
      await fetch("/api/business/onboard/complete", { method: "POST" });
      router.push("/dashboard");
    });

  // ── embed snippet ──────────────────────────────────────────────────────────

  const appUrl   = typeof window !== "undefined" ? window.location.origin : "https://diamondbooking.com";
  const snippet  = `<!-- Diamond Booking Widget -->
<div id="diamond-booking-widget"></div>
<script>
  (function(d,s,id){
    var js,fjs=d.getElementsByTagName(s)[0];
    if(d.getElementById(id))return;
    js=d.createElement(s);js.id=id;
    js.src="${appUrl}/widget.js";
    js.setAttribute('data-business','${businessSlug}');
    js.setAttribute('data-theme','${widget.theme}');
    js.setAttribute('data-primary','${encodeURIComponent(widget.primaryColor)}');
    js.setAttribute('data-accent','${encodeURIComponent(widget.accentColor)}');
    js.setAttribute('data-radius','${widget.borderRadius}');
    js.setAttribute('data-font','${encodeURIComponent(widget.fontFamily)}');
    fjs.parentNode.insertBefore(js,fjs);
  }(document,'script','db-widget'));
</script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── service / addOn / staff helpers ───────────────────────────────────────

  const setServiceField = (id: string, k: keyof Service, v: string | number) =>
    setServices((p) => p.map((s) => (s.id === id ? { ...s, [k]: v } : s)));

  const setAddOnField = (id: string, k: keyof AddOn, v: string | number) =>
    setAddOns((p) => p.map((a) => (a.id === id ? { ...a, [k]: v } : a)));

  const setStaffField = (id: string, k: keyof Omit<StaffMember, "availability">, v: string) =>
    setStaff((p) => p.map((s) => (s.id === id ? { ...s, [k]: v } : s)));

  const setStaffAvail = (sid: string, day: number, k: string, v: string | boolean) =>
    setStaff((p) =>
      p.map((s) =>
        s.id === sid
          ? { ...s, availability: s.availability.map((a) => (a.dayOfWeek === day ? { ...a, [k]: v } : a)) }
          : s
      )
    );

  const setHoursField = (day: number, k: string, v: string | boolean) =>
    setHours((p) => p.map((h) => (h.dayOfWeek === day ? { ...h, [k]: v } : h)));

  // ── radius helper for preview ──────────────────────────────────────────────

  const radPx = { sharp: "4px", soft: "10px", pill: "50px" }[widget.borderRadius];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <Image
            src={HEADER_LOGO_SRC}
            alt="Diamond Booking"
            width={220}
            height={44}
            className="h-[108px] w-auto"
            priority
          />
        </div>
        <p className="text-sm text-gray-500">Let's get your booking page live — takes about 3 minutes</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-end justify-center gap-1 mb-8">
        {STEPS.map((s, i) => {
          const done   = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    done   ? "bg-[#d4a843] text-[#1a1f36]" :
                    active ? "bg-[#1a1f36] text-white ring-4 ring-[#1a1f36]/15" :
                             "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : s.n}
                </div>
                <span
                  className={`text-[10px] font-semibold hidden sm:block leading-none transition-colors ${
                    active ? "text-[#1a1f36]" : done ? "text-[#d4a843]" : "text-gray-300"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-6 sm:w-8 h-0.5 rounded-full mb-5 transition-colors duration-300 ${
                    done ? "bg-[#d4a843]" : "bg-gray-100"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-gray-100/60 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-[#1a1f36] to-[#d4a843] transition-all duration-500"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        <div className="p-8">

          {/* ────────────────────── STEP 1 — Business Info ──────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Tell us about your business</h2>
                <p className="text-sm text-gray-500">This becomes your public booking page identity</p>
              </div>

              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Business Name *</label>
                  <input
                    className={inp}
                    placeholder="e.g. Glow Hair Studio"
                    value={bizName}
                    onChange={(e) => {
                      setBizName(e.target.value);
                      if (!bizSlug) setBizSlug(generateSlug(e.target.value));
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Industry</label>
                  <select className={inp + " appearance-none"} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    {industryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Phone</label>
                  <input className={inp} placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Timezone</label>
                  <select className={inp + " appearance-none"} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {TIMEZONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Booking Page URL</label>
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#1a1f36]/20 focus-within:border-[#1a1f36]">
                    <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 shrink-0">/book/</span>
                    <input
                      className="flex-1 px-3 py-2 text-sm focus:outline-none"
                      placeholder="your-business"
                      value={bizSlug}
                      onChange={(e) => setBizSlug(generateSlug(e.target.value))}
                    />
                  </div>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Description <span className="font-normal normal-case text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    className={inp + " resize-none"}
                    rows={2}
                    placeholder="e.g. Expert hair color and cuts in downtown Portland"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <NavRow onNext={submit1} loading={loading} />
            </div>
          )}

          {/* ────────────────────── STEP 2 — Hours ──────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Set your business hours</h2>
                <p className="text-sm text-gray-500">Clients can only book within these windows</p>
              </div>

              <div className="space-y-2">
                {hours.map((h) => {
                  const day = DAYS_OF_WEEK.find((d) => d.value === h.dayOfWeek)!;
                  return (
                    <div
                      key={h.dayOfWeek}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        h.isClosed ? "bg-gray-50" : "bg-white border border-gray-100"
                      }`}
                    >
                      <span className={`w-20 text-sm font-semibold shrink-0 ${h.isClosed ? "text-gray-400" : "text-gray-700"}`}>
                        {day.label}
                      </span>

                      <Toggle
                        checked={!h.isClosed}
                        onChange={(v) => setHoursField(h.dayOfWeek, "isClosed", !v)}
                      />

                      {!h.isClosed ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={h.openTime}
                            onChange={(e) => setHoursField(h.dayOfWeek, "openTime", e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a1f36]"
                          />
                          <span className="text-gray-400 text-xs shrink-0">to</span>
                          <input
                            type="time"
                            value={h.closeTime}
                            onChange={(e) => setHoursField(h.dayOfWeek, "closeTime", e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a1f36]"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <NavRow onBack={() => setStep(1)} onNext={submit2} loading={loading} />
            </div>
          )}

          {/* ────────────────────── STEP 3 — Services ───────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Add your services</h2>
                <p className="text-sm text-gray-500">What can clients book with you? You can always add more later.</p>
              </div>

              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

              <div className="space-y-3">
                {services.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Color swatch */}
                      <div className="shrink-0 mt-1">
                        <input
                          type="color"
                          value={s.color}
                          onChange={(e) => setServiceField(s.id, "color", e.target.value)}
                          className="w-9 h-9 rounded-lg cursor-pointer border-2 border-white shadow-sm p-0.5"
                        />
                      </div>

                      <div className="flex-1 space-y-2">
                        <input
                          className={inp}
                          placeholder="Service name  (e.g. Haircut & Style)"
                          value={s.name}
                          onChange={(e) => setServiceField(s.id, "name", e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duration</label>
                            <select
                              className={inp + " appearance-none"}
                              value={s.duration}
                              onChange={(e) => setServiceField(s.id, "duration", Number(e.target.value))}
                            >
                              {DURATION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input
                                className={inp + " pl-7"}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={s.price}
                                onChange={(e) => setServiceField(s.id, "price", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {services.length > 1 && (
                        <button
                          onClick={() => setServices((p) => p.filter((x) => x.id !== s.id))}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setServices((p) => [
                      ...p,
                      { id: `s${Date.now()}`, name: "", duration: 60, price: "", color: SERVICE_COLORS[p.length % SERVICE_COLORS.length] },
                    ])
                  }
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#1a1f36]/30 hover:text-[#1a1f36] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add another service
                </button>
              </div>

              <NavRow onBack={() => setStep(2)} onNext={submit3} loading={loading} />
            </div>
          )}

          {/* ────────────────────── STEP 4 — Add-ons ────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Add-ons & upsells</h2>
                <p className="text-sm text-gray-500">
                  Optional extras clients can tack onto any booking — treatments, products, upgrades.
                </p>
              </div>

              <div className="space-y-3">
                {addOns.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-0.5">No add-ons yet</p>
                    <p className="text-xs text-gray-400">
                      Try: deep conditioning, scalp massage, express blowout, product bundles…
                    </p>
                  </div>
                ) : (
                  addOns.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/40">
                      <div className="space-y-2">
                        <input
                          className={inp}
                          placeholder="Add-on name  (e.g. Deep Conditioning Treatment)"
                          value={a.name}
                          onChange={(e) => setAddOnField(a.id, "name", e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Extra Time</label>
                            <select
                              className={inp + " appearance-none"}
                              value={a.extraMinutes}
                              onChange={(e) => setAddOnField(a.id, "extraMinutes", Number(e.target.value))}
                            >
                              {[0, 10, 15, 20, 30, 45, 60].map((m) => (
                                <option key={m} value={m}>{m === 0 ? "No extra time" : `+${m} min`}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price</label>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <input
                                  className={inp + " pl-7"}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={a.price}
                                  onChange={(e) => setAddOnField(a.id, "price", e.target.value)}
                                />
                              </div>
                              <button
                                onClick={() => setAddOns((p) => p.filter((x) => x.id !== a.id))}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <button
                  onClick={() =>
                    setAddOns((p) => [...p, { id: `a${Date.now()}`, name: "", price: "", extraMinutes: 15 }])
                  }
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#1a1f36]/30 hover:text-[#1a1f36] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add an add-on
                </button>
              </div>

              <NavRow
                onBack={() => setStep(3)}
                onNext={submit4}
                loading={loading}
                nextLabel={addOns.length === 0 ? "Skip — no add-ons" : "Continue"}
              />
            </div>
          )}

          {/* ────────────────────── STEP 5 — Staff ──────────────────────── */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Add your team</h2>
                <p className="text-sm text-gray-500">Set each person's name and their individual weekly availability</p>
              </div>

              <div className="space-y-3">
                {staff.map((m) => {
                  const open = expandedStaff === m.id;
                  return (
                    <div key={m.id} className="rounded-xl border border-gray-100 overflow-hidden">
                      {/* Card header */}
                      <div
                        className="flex items-center gap-3 p-4 bg-gray-50/60 cursor-pointer"
                        onClick={() => setExpandedStaff(open ? null : m.id)}
                      >
                        <div className="w-9 h-9 rounded-full bg-[#1a1f36]/10 flex items-center justify-center text-sm font-bold text-[#1a1f36] shrink-0">
                          {m.name ? m.name[0].toUpperCase() : "?"}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            className={inp}
                            placeholder="Full name *"
                            value={m.name}
                            onChange={(e) => setStaffField(m.id, "name", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <input
                            className={inp}
                            placeholder="Email (optional)"
                            value={m.email}
                            onChange={(e) => setStaffField(m.id, "email", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {staff.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStaff((p) => p.filter((s) => s.id !== m.id));
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                        </div>
                      </div>

                      {/* Availability grid */}
                      {open && (
                        <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-2 bg-white">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            {m.name ? `${m.name}'s` : "Their"} weekly availability
                          </p>
                          {m.availability.map((a) => {
                            const day = DAYS_OF_WEEK.find((d) => d.value === a.dayOfWeek)!;
                            return (
                              <div key={a.dayOfWeek} className="flex items-center gap-3">
                                <span className={`w-12 text-xs font-semibold shrink-0 ${a.isClosed ? "text-gray-400" : "text-gray-600"}`}>
                                  {day.short}
                                </span>
                                <Toggle
                                  checked={!a.isClosed}
                                  onChange={(v) => setStaffAvail(m.id, a.dayOfWeek, "isClosed", !v)}
                                />
                                {!a.isClosed ? (
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <input
                                      type="time"
                                      value={a.openTime}
                                      onChange={(e) => setStaffAvail(m.id, a.dayOfWeek, "openTime", e.target.value)}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a1f36]"
                                    />
                                    <span className="text-gray-400 text-xs shrink-0">–</span>
                                    <input
                                      type="time"
                                      value={a.closeTime}
                                      onChange={(e) => setStaffAvail(m.id, a.dayOfWeek, "closeTime", e.target.value)}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a1f36]"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">Off</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => {
                    const id = `m${Date.now()}`;
                    setStaff((p) => [...p, { id, name: "", email: "", availability: defaultAvail() }]);
                    setExpandedStaff(id);
                  }}
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#1a1f36]/30 hover:text-[#1a1f36] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add another team member
                </button>
              </div>

              <NavRow
                onBack={() => setStep(4)}
                onNext={submit5}
                loading={loading}
                nextLabel={staff.every((s) => !s.name.trim()) ? "Skip — just me" : "Continue"}
              />
            </div>
          )}

          {/* ────────────────────── STEP 6 — Widget ─────────────────────── */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Customize your booking widget</h2>
                <p className="text-sm text-gray-500">Design how the calendar looks on your website and booking page</p>
              </div>

              <div className="grid grid-cols-5 gap-5">
                {/* Controls — 3 cols */}
                <div className="col-span-3 space-y-4">

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={widget.primaryColor}
                          onChange={(e) => setWidget((w) => ({ ...w, primaryColor: e.target.value }))}
                          className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5 shrink-0"
                        />
                        <input
                          className={inp}
                          value={widget.primaryColor}
                          onChange={(e) => setWidget((w) => ({ ...w, primaryColor: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={widget.accentColor}
                          onChange={(e) => setWidget((w) => ({ ...w, accentColor: e.target.value }))}
                          className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5 shrink-0"
                        />
                        <input
                          className={inp}
                          value={widget.accentColor}
                          onChange={(e) => setWidget((w) => ({ ...w, accentColor: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Corner style */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Corner Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["sharp", "soft", "pill"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setWidget((w) => ({ ...w, borderRadius: r }))}
                          className={`py-2 text-xs font-semibold rounded-xl border transition-all capitalize ${
                            widget.borderRadius === r
                              ? "bg-[#1a1f36] text-white border-[#1a1f36]"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Theme</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["light", "dark", "auto"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setWidget((w) => ({ ...w, theme: t }))}
                          className={`py-2 text-xs font-semibold rounded-xl border transition-all capitalize ${
                            widget.theme === t
                              ? "bg-[#1a1f36] text-white border-[#1a1f36]"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Font</label>
                    <select
                      className={inp + " appearance-none"}
                      value={widget.fontFamily}
                      onChange={(e) => setWidget((w) => ({ ...w, fontFamily: e.target.value }))}
                    >
                      {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>

                  {/* Button text */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Button Label</label>
                    <input
                      className={inp}
                      value={widget.buttonText}
                      onChange={(e) => setWidget((w) => ({ ...w, buttonText: e.target.value }))}
                    />
                  </div>

                  {/* Welcome message */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Welcome Message</label>
                    <textarea
                      className={inp + " resize-none"}
                      rows={2}
                      value={widget.welcomeMessage}
                      onChange={(e) => setWidget((w) => ({ ...w, welcomeMessage: e.target.value }))}
                    />
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2.5 pt-1">
                    {[
                      { k: "showPrices" as const,       label: "Show service prices" },
                      { k: "showStaffAvatars" as const, label: "Show staff names/avatars" },
                      { k: "showLogo" as const,         label: "Show business logo" },
                    ].map(({ k, label }) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{label}</span>
                        <Toggle checked={widget[k]} onChange={(v) => setWidget((w) => ({ ...w, [k]: v }))} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview — 2 cols */}
                <div className="col-span-2 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Preview</p>
                  <div
                    className="rounded-xl border border-gray-100 overflow-hidden shadow-md text-[13px]"
                    style={{
                      fontFamily: `'${widget.fontFamily}', sans-serif`,
                      background: widget.theme === "dark" ? "#0f1117" : "#fff",
                      color: widget.theme === "dark" ? "#e8e8e8" : "#1a1f36",
                    }}
                  >
                    {/* Header */}
                    <div className="p-3.5" style={{ background: widget.primaryColor }}>
                      <p className="text-sm font-bold text-white leading-tight">{bizName || "Your Business"}</p>
                      <p className="text-[11px] text-white/65 mt-0.5 leading-snug">{widget.welcomeMessage}</p>
                    </div>

                    {/* Services */}
                    <div className="p-2.5 space-y-1.5">
                      {(services.filter((s) => s.name).length > 0
                        ? services.filter((s) => s.name)
                        : [{ id: "x1", name: "Haircut & Style", duration: 60, price: "65", color: widget.primaryColor }]
                      ).slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between px-2.5 py-2"
                          style={{
                            borderRadius: radPx,
                            border: `1px solid ${widget.theme === "dark" ? "rgba(255,255,255,0.08)" : "#f0f0f0"}`,
                            background: widget.theme === "dark" ? "rgba(255,255,255,0.04)" : "#fafafa",
                          }}
                        >
                          <div>
                            <p className="text-xs font-semibold leading-none">{s.name}</p>
                            <p className="text-[10px] opacity-50 mt-0.5">{s.duration} min</p>
                          </div>
                          {widget.showPrices && s.price && (
                            <span className="text-xs font-bold" style={{ color: widget.accentColor }}>${s.price}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="px-2.5 pb-2.5">
                      <div
                        className="w-full py-2 text-center text-xs font-bold"
                        style={{
                          background: widget.accentColor,
                          color: "#1a1f36",
                          borderRadius: radPx,
                        }}
                      >
                        {widget.buttonText}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center">Powered by Diamond Booking</p>
                </div>
              </div>

              <NavRow onBack={() => setStep(5)} onNext={submit6} loading={loading} nextLabel="Generate Embed Code →" />
            </div>
          )}

          {/* ────────────────────── STEP 7 — Go Live ────────────────────── */}
          {step === 7 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d4a843] to-amber-300 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-200/60">
                  <Sparkles className="w-8 h-8 text-[#1a1f36]" />
                </div>
                <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Your booking page is live!</h2>
                <p className="text-sm text-gray-500">Share your link or embed the calendar anywhere on your site</p>
              </div>

              {/* Direct link */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Booking Link</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="flex-1 text-sm font-medium text-[#1a1f36] truncate">
                    {typeof window !== "undefined" ? window.location.origin : "https://diamondbooking.com"}/book/{businessSlug}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${typeof window !== "undefined" ? window.location.origin : ""}/book/${businessSlug}`)}
                    className="px-3 py-1.5 text-xs font-bold bg-[#1a1f36] text-white rounded-lg hover:bg-[#1a1f36]/90 transition-colors shrink-0"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Embed snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Embed on Your Website</p>
                  <button
                    onClick={copySnippet}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-[#1a1f36] text-white hover:bg-[#1a1f36]/90"
                    }`}
                  >
                    {copied ? (
                      <><CheckCheck className="w-3.5 h-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy Code</>
                    )}
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-gray-800">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1f36]">
                    {["#ff5f57","#febc2e","#28c840"].map((c) => (
                      <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                    ))}
                    <span className="ml-2 text-[11px] text-gray-400 font-mono">embed snippet</span>
                  </div>
                  <pre className="p-4 bg-[#0f1117] text-[11px] leading-relaxed overflow-x-auto font-mono text-[#a8b4cc] whitespace-pre-wrap break-all">
                    <code>{snippet}</code>
                  </pre>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-blue-800">How to install</p>
                  <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
                    <li>Copy the code above</li>
                    <li>Paste it into your website's HTML where you want the booking calendar to appear</li>
                    <li>Works with Squarespace, WordPress, Wix, Webflow, or any custom site</li>
                    <li>The widget auto-loads with your brand colors and services</li>
                  </ol>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gradient-to-br from-[#1a1f36]/5 to-[#d4a843]/5 rounded-xl border border-[#d4a843]/20">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">What we set up for you</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    `${services.filter((s) => s.name).length} service${services.filter((s) => s.name).length !== 1 ? "s" : ""}`,
                    addOns.filter((a) => a.name).length > 0
                      ? `${addOns.filter((a) => a.name).length} add-on${addOns.filter((a) => a.name).length !== 1 ? "s" : ""}`
                      : null,
                    `${staff.filter((s) => s.name).length || 1} team member${(staff.filter((s) => s.name).length || 1) !== 1 ? "s" : ""}`,
                    "Weekly schedule",
                    "Custom widget style",
                    "Embeddable booking calendar",
                    "Public booking page",
                  ].filter(Boolean).map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-gray-700">
                      <Check className="w-3.5 h-3.5 text-[#d4a843] shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <NavRow
                onBack={() => setStep(6)}
                onNext={finish}
                loading={loading}
                nextLabel="Go to Dashboard →"
                isLast
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
