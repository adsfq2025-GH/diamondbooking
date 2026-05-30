// src/components/dashboard/onboarding-wizard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Building2, Clock, Scissors, Users, Palette,
  Code2, Check, Plus, Trash2, ChevronRight, ChevronDown,
  Copy, CheckCheck, Sparkles,
} from "lucide-react";
import QRCode from "qrcode";
import {
  generateSlug,
  INDUSTRY_OPTIONS,
  DAYS_OF_WEEK,
  DURATION_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/lib/utils";
import { PricingBuilder } from "@/components/dashboard/pricing-builder";
import { OnboardingStepHelp } from "@/components/dashboard/onboarding-step-help";
import { buildWidgetEmbedSnippet, getPublicAppUrl } from "@/lib/widget-embed";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  duration: number;
  price: string;
  billingUnit: "PER_JOB" | "PER_HOUR";
  minimumEnabled: boolean;
  minimumHours: string;
  color: string;
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
  role?: string;
  phone?: string;
  commissionPercent?: string;
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
  { n: 1, label: "Plan", icon: Sparkles },
  { n: 2, label: "Business", icon: Building2 },
  { n: 3, label: "Payment", icon: CheckCheck },
  { n: 4, label: "Intro", icon: ChevronRight },
  { n: 5, label: "Hours", icon: Clock },
  { n: 6, label: "Staff", icon: Users },
  { n: 7, label: "Services", icon: Scissors },
  { n: 8, label: "Pricing", icon: Sparkles },
  { n: 9, label: "Branding", icon: Palette },
  { n: 10, label: "Widget", icon: Code2 },
  { n: 11, label: "Review", icon: Check },
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
  onSkip,
  onNext,
  loading,
  nextLabel = "Continue",
  isLast = false,
}: {
  onBack?: () => void;
  onSkip?: () => void;
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
      {onSkip && (
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Skip for now
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
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);

  // Step 1
  const [selectedTier, setSelectedTier] = useState<null | "starter" | "pro" | "elite">(null);

  // Step 2
  const [bizName, setBizName]           = useState("");
  const [bizSlug, setBizSlug]           = useState("");
  const [industry, setIndustry]         = useState("generic");
  const [phone, setPhone]               = useState("");
  const [timezone, setTimezone]         = useState("America/New_York");
  const [description, setDescription]  = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [website, setWebsite] = useState("");
  const [industryOptions, setIndustryOptions] = useState(INDUSTRY_OPTIONS);

  // Step 5
  const [hours, setHours] = useState<DayAvail[]>(defaultAvail());

  // Step 7
  const [services, setServices] = useState<Service[]>([
    { id: "s1", name: "", duration: 60, price: "", billingUnit: "PER_JOB", minimumEnabled: false, minimumHours: "2", color: SERVICE_COLORS[0] },
  ]);

  // Step 6
  const [staff, setStaff]               = useState<StaffMember[]>([
    { id: "m1", name: "", email: "", role: "", phone: "", commissionPercent: "", availability: defaultAvail() },
  ]);
  const [expandedStaff, setExpandedStaff] = useState<string | null>("m1");

  // Step 9
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
  const [paymentReady, setPaymentReady] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

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

  const persistDraft = async () => {
    setSaveState("saving");
    try {
      const draft = {
        selectedTier,
        skippedSteps,
        business: {
          bizName,
          bizSlug,
          industry,
          phone,
          timezone,
          description,
          address1,
          city,
          state,
          zip,
          website,
        },
        hours,
        staff,
        services,
        widget,
      };
      localStorage.setItem("db:onboarding", JSON.stringify(draft));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 800);
    } catch {
      setSaveState("error");
    }
  };

  const skipTo = (next: number) => {
    setSkippedSteps((p) => (p.includes(step) ? p : [...p, step]));
    setStep(next);
    void persistDraft();
  };

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam) {
      const n = Number(stepParam);
      if (Number.isFinite(n) && n >= 1 && n <= STEPS.length) setStep(n);
    }

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("db:onboarding");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        selectedTier?: null | "starter" | "pro" | "elite";
        skippedSteps?: number[];
        business?: Partial<{
          bizName: string;
          bizSlug: string;
          industry: string;
          phone: string;
          timezone: string;
          description: string;
          address1: string;
          city: string;
          state: string;
          zip: string;
          website: string;
        }>;
        hours?: DayAvail[];
        staff?: StaffMember[];
        services?: Service[];
        widget?: WidgetConfig;
      };
      if (parsed.selectedTier) setSelectedTier(parsed.selectedTier);
      if (Array.isArray(parsed.skippedSteps)) setSkippedSteps(parsed.skippedSteps);
      if (parsed.business?.bizName) setBizName(parsed.business.bizName);
      if (parsed.business?.bizSlug) setBizSlug(parsed.business.bizSlug);
      if (parsed.business?.industry) setIndustry(parsed.business.industry);
      if (parsed.business?.phone) setPhone(parsed.business.phone);
      if (parsed.business?.timezone) setTimezone(parsed.business.timezone);
      if (parsed.business?.description) setDescription(parsed.business.description);
      if (parsed.business?.address1) setAddress1(parsed.business.address1);
      if (parsed.business?.city) setCity(parsed.business.city);
      if (parsed.business?.state) setState(parsed.business.state);
      if (parsed.business?.zip) setZip(parsed.business.zip);
      if (parsed.business?.website) setWebsite(parsed.business.website);
      if (Array.isArray(parsed.hours)) setHours(parsed.hours);
      if (Array.isArray(parsed.staff) && parsed.staff.length) setStaff(parsed.staff);
      if (Array.isArray(parsed.services) && parsed.services.length) setServices(parsed.services);
      if (parsed.widget) setWidget(parsed.widget);
    } catch {
    }
  }, []);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const res = await fetch("/api/billing/subscription");
        const json = await res.json();
        if (!res.ok) return;
        const sub = json.data as null | { plan?: string; status?: string };
        if (!sub?.status) return;
        if (sub.status === "TRIALING" || sub.status === "ACTIVE") setPaymentReady(true);
        if (!selectedTier && sub.plan) {
          if (sub.plan === "STARTER") setSelectedTier("starter");
          if (sub.plan === "PROFESSIONAL") setSelectedTier("pro");
          if (sub.plan === "ENTERPRISE") setSelectedTier("elite");
        }
      } catch {
      }
    };
    void loadSubscription();
  }, [selectedTier]);

  useEffect(() => {
    if (step === 3 && paymentReady) setStep(4);
  }, [paymentReady, step]);

  useEffect(() => {
    if (!businessSlug) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.diamond-booking.com";
    const link = `${origin}/book/${businessSlug}`;
    QRCode.toDataURL(link, { margin: 1, width: 256 })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [businessSlug]);

  // ── step submitters ────────────────────────────────────────────────────────

  const submitPlan = () =>
    go(async () => {
      if (!selectedTier) throw new Error("Select a plan to continue");
      await persistDraft();
      setStep(2);
    });

  const submitBusiness = () =>
    go(async () => {
      if (!bizName.trim()) throw new Error("Business name is required");
      const slug = bizSlug || generateSlug(bizName);
      const res  = await fetch("/api/business/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bizName,
          slug,
          industry,
          phone,
          timezone,
          description,
          address: address1,
          city,
          state,
          zipCode: zip,
          website,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setBusinessSlug(json.data.slug);
      await updateSession({ businessId: json.data.id, businessSlug: json.data.slug });
      await persistDraft();
      setStep(3);
    });

  const startPayment = () =>
    go(async () => {
      if (!selectedTier) throw new Error("Select a plan first");
      const plan =
        selectedTier === "starter"
          ? "STARTER"
          : selectedTier === "pro"
            ? "PROFESSIONAL"
            : "ENTERPRISE";

      const returnTo = encodeURIComponent("/onboarding?step=4");
      const cancelTo = encodeURIComponent("/onboarding?step=3");
      window.location.assign(
        `/api/billing/create-checkout?plan=${encodeURIComponent(plan)}&interval=monthly&trialDays=14&returnTo=${returnTo}&cancelTo=${cancelTo}`
      );
    });

  const submitIntro = () =>
    go(async () => {
      await persistDraft();
      setStep(5);
    });

  const submitHours = () =>
    go(async () => {
      await fetch("/api/business/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      await persistDraft();
      setStep(6);
    });

  const submitStaff = () =>
    go(async () => {
      const valid = staff.filter((s) => s.name.trim());
      if (valid.length) {
        await Promise.all(
          valid.map((s) =>
            fetch("/api/staff", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: s.name,
                email: s.email || undefined,
                phone: s.phone || undefined,
                role: s.role || undefined,
                commissionPercent: s.commissionPercent ? Number(s.commissionPercent) : undefined,
                availability: s.availability,
              }),
            })
          )
        );
      }
      await persistDraft();
      setStep(7);
    });

  const submitServices = () =>
    go(async () => {
      const valid = services.filter((s) => s.name.trim());
      if (!valid.length) throw new Error("Add at least one service");
      await Promise.all(
        valid.map((s) =>
          fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify((() => {
              const price = parseFloat(s.price) || 0;
              const minHours = s.billingUnit === "PER_HOUR" && s.minimumEnabled ? Number(s.minimumHours) : NaN;
              const minDurationMinutes =
                s.billingUnit === "PER_HOUR" && Number.isFinite(minHours) && minHours > 0
                  ? Math.floor(minHours) * 60
                  : undefined;
              const duration =
                s.billingUnit === "PER_HOUR"
                  ? Math.max(minDurationMinutes ?? 60, s.duration)
                  : s.duration;
              return {
                name: s.name,
                duration,
                price,
                billingUnit: s.billingUnit,
                minDurationMinutes,
                color: s.color,
              };
            })()),
          })
        )
      );
      await persistDraft();
      setStep(8);
    });

  const submitPricing = () =>
    go(async () => {
      await persistDraft();
      setStep(9);
    });

  const submitBranding = () =>
    go(async () => {
      await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryColor: widget.primaryColor, welcomeMessage: widget.welcomeMessage }),
      });
      await persistDraft();
      setStep(10);
    });

  const submitWidget = () =>
    go(async () => {
      await persistDraft();
      setStep(11);
    });

  const finish = () =>
    go(async () => {
      await fetch("/api/business/onboard/complete", { method: "POST" });
      router.push("/dashboard");
    });

  // ── embed snippet ──────────────────────────────────────────────────────────

  const appUrl = getPublicAppUrl();
  const snippet = buildWidgetEmbedSnippet(businessSlug);

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── service / addOn / staff helpers ───────────────────────────────────────

  const setServiceField = (id: string, k: keyof Service, v: string | number) =>
    setServices((p) => p.map((s) => (s.id === id ? { ...s, [k]: v } : s)));

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
        <p className="text-sm text-gray-500">Let&apos;s get your booking page live — takes about 3 minutes</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-end justify-center gap-1 mb-8">
        {STEPS.map((s, i) => {
          const done   = step > s.n || skippedSteps.includes(s.n);
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  onClick={() => {
                    if (done && !active) setStep(s.n);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    done   ? "bg-[#d4a843] text-[#1a1f36]" :
                    active ? "bg-[#1a1f36] text-white ring-4 ring-[#1a1f36]/15" :
                             "bg-gray-100 text-gray-400"
                  } ${done && !active ? "cursor-pointer" : ""}`}
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

          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Choose your plan</h2>
                  <p className="text-sm text-gray-500">Select a tier to continue. No plan is selected by default.</p>
                </div>
                <OnboardingStepHelp step={1} />
              </div>

              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: "starter" as const, name: "Starter", price: "$29/mo", features: ["Online booking", "Staff management", "Basic widget"] },
                  { key: "pro" as const, name: "Professional", price: "$59/mo", features: ["Everything in Starter", "Advanced automations", "Priority support"] },
                  { key: "elite" as const, name: "Elite", price: "$119/mo", features: ["Everything in Pro", "Multi-location ready", "Highest limits"] },
                ].map((p) => {
                  const active = selectedTier === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setSelectedTier(p.key);
                        void persistDraft();
                      }}
                      className={`text-left p-4 rounded-2xl border transition-all ${
                        active ? "border-[#1a1f36] ring-4 ring-[#1a1f36]/10 bg-white" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-[#1a1f36]">{p.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{p.price}</div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            active ? "border-[#1a1f36] bg-[#1a1f36]" : "border-gray-300 bg-white"
                          }`}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {p.features.map((f) => (
                          <li key={f} className="text-xs text-gray-600 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843]" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <NavRow onNext={submitPlan} loading={loading} nextLabel="Continue" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Account and business information</h2>
                  <p className="text-sm text-gray-500">Set up your business details. You can update these later.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">
                    {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Error saving" : ""}
                  </div>
                  <OnboardingStepHelp step={2} />
                </div>
              </div>

              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Business Name *</label>
                  <input
                    className={inp}
                    placeholder="e.g. Glow Hair Studio"
                    value={bizName}
                    onBlur={() => void persistDraft()}
                    onChange={(e) => {
                      setBizName(e.target.value);
                      if (!bizSlug) setBizSlug(generateSlug(e.target.value));
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Industry *</label>
                  <select
                    className={inp + " appearance-none"}
                    value={industry}
                    onBlur={() => void persistDraft()}
                    onChange={(e) => {
                      setIndustry(e.target.value);
                      void persistDraft();
                    }}
                  >
                    {industryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Business Phone *</label>
                  <input
                    className={inp}
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onBlur={() => void persistDraft()}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Time zone *</label>
                  <select
                    className={inp + " appearance-none"}
                    value={timezone}
                    onBlur={() => void persistDraft()}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {TIMEZONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Business Address *</label>
                  <input className={inp} placeholder="Street address" value={address1} onBlur={() => void persistDraft()} onChange={(e) => setAddress1(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">City *</label>
                  <input className={inp} value={city} onBlur={() => void persistDraft()} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">State *</label>
                  <input className={inp} value={state} onBlur={() => void persistDraft()} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">ZIP *</label>
                  <input className={inp} value={zip} onBlur={() => void persistDraft()} onChange={(e) => setZip(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Website (optional)</label>
                  <input className={inp} placeholder="https://…" value={website} onBlur={() => void persistDraft()} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Description <span className="font-normal normal-case text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    className={inp + " resize-none"}
                    rows={2}
                    placeholder="A short description customers will see when booking"
                    value={description}
                    onBlur={() => void persistDraft()}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <NavRow onBack={() => setStep(1)} onNext={submitBusiness} loading={loading} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Subscription payment setup</h2>
                  <p className="text-sm text-gray-500">Save a payment method to start your free trial.</p>
                </div>
                <OnboardingStepHelp step={3} />
              </div>

              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#1a1f36]">Selected plan</div>
                  <div className="text-sm font-bold text-[#1a1f36]">
                    {selectedTier === "starter" ? "Starter — $29/mo" : selectedTier === "pro" ? "Professional — $59/mo" : "Elite — $119/mo"}
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  You will not be charged today. Billing begins when your free trial ends. Your plan renews monthly unless canceled.
                </div>
              </div>

              {paymentReady ? (
                <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50 text-sm text-emerald-700">
                  Payment method saved. Free trial is active.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startPayment}
                  disabled={loading || !selectedTier}
                  className="w-full py-3 rounded-xl bg-[#1a1f36] text-white font-bold hover:bg-[#1a1f36]/90 disabled:opacity-50"
                >
                  Save payment method and start free trial
                </button>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!paymentReady}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 bg-[#1a1f36] text-white hover:bg-[#1a1f36]/90 disabled:opacity-50"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Let’s build your business system</h2>
                  <p className="text-sm text-gray-500">Next you’ll set hours, staff, services, pricing, and your booking widget.</p>
                </div>
                <OnboardingStepHelp step={4} />
              </div>
              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2 text-sm text-gray-700">
                <div className="font-semibold text-[#1a1f36]">What’s coming</div>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-600">
                  <li>Business hours</li>
                  <li>Staff & availability</li>
                  <li>Services</li>
                  <li>Pricing rules</li>
                  <li>Branding & widget</li>
                </ol>
              </div>
              <NavRow onBack={() => setStep(3)} onNext={submitIntro} loading={loading} nextLabel="Let's build your business system" />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Set your business hours</h2>
                  <p className="text-sm text-gray-500">Clients can only book within these windows</p>
                </div>
                <OnboardingStepHelp step={5} />
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

              <NavRow onBack={() => setStep(4)} onSkip={() => skipTo(6)} onNext={submitHours} loading={loading} />
            </div>
          )}

          {step === 7 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Add your services</h2>
                  <p className="text-sm text-gray-500">What can clients book with you? You can always add more later.</p>
                </div>
                <OnboardingStepHelp step={7} />
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Billing</label>
                            <select
                              className={inp + " appearance-none"}
                              value={s.billingUnit}
                              onChange={(e) => {
                                const next = e.target.value as "PER_JOB" | "PER_HOUR";
                                setServices((p) =>
                                  p.map((x) =>
                                    x.id === s.id
                                      ? {
                                          ...x,
                                          billingUnit: next,
                                          minimumEnabled: next === "PER_HOUR" ? x.minimumEnabled : false,
                                          duration: next === "PER_HOUR" ? Math.max(60, x.duration) : x.duration,
                                        }
                                      : x
                                  )
                                );
                              }}
                            >
                              <option value="PER_JOB">Per job</option>
                              <option value="PER_HOUR">Per hour</option>
                            </select>
                          </div>
                        </div>

                        {s.billingUnit === "PER_HOUR" && (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-gray-100">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-800">Minimum hours</div>
                              <div className="text-xs text-gray-500">Optional. If enabled, customers must book at least this many hours.</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setServices((p) =>
                                    p.map((x) =>
                                      x.id === s.id ? { ...x, minimumEnabled: !x.minimumEnabled } : x
                                    )
                                  )
                                }
                                className={`w-10 h-6 rounded-full relative transition-colors ${
                                  s.minimumEnabled ? "bg-[#1a1f36]" : "bg-gray-200"
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                                    s.minimumEnabled ? "translate-x-4" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                              <input
                                className={inp + " w-24"}
                                type="number"
                                min="1"
                                step="1"
                                disabled={!s.minimumEnabled}
                                value={s.minimumHours}
                                onChange={(e) => setServiceField(s.id, "minimumHours", e.target.value)}
                              />
                            </div>
                          </div>
                        )}
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
                      {
                        id: `s${Date.now()}`,
                        name: "",
                        duration: 60,
                        price: "",
                        billingUnit: "PER_JOB",
                        minimumEnabled: false,
                        minimumHours: "2",
                        color: SERVICE_COLORS[p.length % SERVICE_COLORS.length],
                      },
                    ])
                  }
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#1a1f36]/30 hover:text-[#1a1f36] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add another service
                </button>
              </div>

              <NavRow onBack={() => setStep(6)} onSkip={() => skipTo(8)} onNext={submitServices} loading={loading} />
            </div>
          )}

          {step === 8 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Pricing & intake</h2>
                  <p className="text-sm text-gray-500">
                    Customize your booking questions, add-ons, commercial pricing, and recurring discounts. This is what powers live pricing on the booking widget.
                  </p>
                </div>
                <OnboardingStepHelp step={8} />
              </div>

              <PricingBuilder />

              <NavRow
                onBack={() => setStep(7)}
                onSkip={() => skipTo(9)}
                onNext={submitPricing}
                loading={loading}
                nextLabel="Continue"
              />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Add your team</h2>
                  <p className="text-sm text-gray-500">Set each person&apos;s name and their individual weekly availability</p>
                </div>
                <OnboardingStepHelp step={6} />
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
                        <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3 bg-white">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className={inp}
                              placeholder="Role (optional)"
                              value={m.role ?? ""}
                              onChange={(e) => setStaffField(m.id, "role", e.target.value)}
                            />
                            <input
                              className={inp}
                              placeholder="Commission % (optional)"
                              value={m.commissionPercent ?? ""}
                              onChange={(e) => setStaffField(m.id, "commissionPercent", e.target.value)}
                            />
                            <input
                              className={inp}
                              placeholder="Phone (optional)"
                              value={m.phone ?? ""}
                              onChange={(e) => setStaffField(m.id, "phone", e.target.value)}
                            />
                          </div>
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
                    setStaff((p) => [...p, { id, name: "", email: "", role: "", phone: "", commissionPercent: "", availability: defaultAvail() }]);
                    setExpandedStaff(id);
                  }}
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#1a1f36]/30 hover:text-[#1a1f36] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add another team member
                </button>
              </div>

              <NavRow
                onBack={() => setStep(5)}
                onSkip={() => skipTo(7)}
                onNext={submitStaff}
                loading={loading}
                nextLabel="Continue"
              />
            </div>
          )}

          {step === 9 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Customize your booking widget</h2>
                  <p className="text-sm text-gray-500">Design how the calendar looks on your website and booking page</p>
                </div>
                <OnboardingStepHelp step={9} />
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
                            <span className="text-xs font-bold" style={{ color: widget.accentColor }}>
                              ${s.price}{(s as { billingUnit?: string }).billingUnit === "PER_HOUR" ? "/hr" : ""}
                            </span>
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

              <NavRow onBack={() => setStep(8)} onSkip={() => skipTo(10)} onNext={submitBranding} loading={loading} nextLabel="Generate Embed Code →" />
            </div>
          )}

          {step === 10 && (
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

              {qrDataUrl && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">QR Code</p>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <img src={qrDataUrl} alt="Booking QR code" className="w-24 h-24 rounded-lg border border-gray-200 bg-white" />
                    <div className="flex-1 text-xs text-gray-600">
                      Customers can scan to open your booking link.
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = qrDataUrl;
                            a.download = `${businessSlug}-qr.png`;
                            a.click();
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-[#1a1f36] text-white rounded-lg hover:bg-[#1a1f36]/90 transition-colors"
                        >
                          Download QR
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Embed snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Embed on Your Website</p>
                    <OnboardingStepHelp step={10} />
                  </div>
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
                    <li>Paste it into your website&apos;s HTML where you want the booking calendar to appear</li>
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
                    `${staff.filter((s) => s.name).length || 1} team member${(staff.filter((s) => s.name).length || 1) !== 1 ? "s" : ""}`,
                    "Weekly schedule",
                    "Live pricing & intake rules",
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
                onBack={() => setStep(9)}
                onNext={submitWidget}
                loading={loading}
                nextLabel="Continue to Review →"
              />
            </div>
          )}

          {step === 11 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#1a1f36] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-gray-200/60">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-bold text-[#1a1f36] mb-1">Final review</h2>
                  <OnboardingStepHelp step={11} />
                </div>
                <p className="text-sm text-gray-500">Confirm your setup and finish.</p>
              </div>

              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#1a1f36]">Business</div>
                  <button type="button" onClick={() => setStep(2)} className="text-xs font-bold text-[#1a1f36] hover:underline">
                    Edit
                  </button>
                </div>
                <div className="text-sm text-gray-700">{bizName || "—"}</div>
                <div className="text-xs text-gray-500">{industry}</div>
                <div className="text-xs text-gray-500">{businessSlug ? `/book/${businessSlug}` : ""}</div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#1a1f36]">Services</div>
                  <button type="button" onClick={() => setStep(7)} className="text-xs font-bold text-[#1a1f36] hover:underline">
                    Edit
                  </button>
                </div>
                <div className="text-sm text-gray-700">{services.filter((s) => s.name.trim()).length} service(s)</div>
              </div>

              <NavRow onBack={() => setStep(10)} onNext={finish} loading={loading} nextLabel="Finish setup →" isLast />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
