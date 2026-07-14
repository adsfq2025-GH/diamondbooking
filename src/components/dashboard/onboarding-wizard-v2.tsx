"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";
import {
  DAYS_OF_WEEK,
  INDUSTRY_DEFAULT_SERVICE_DURATION_MINUTES,
  INDUSTRY_OPTIONS,
  TIMEZONE_OPTIONS,
  generateSlug,
} from "@/lib/utils";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { PricingBuilder } from "@/components/dashboard/pricing-builder";
import { WidgetAccessCard } from "@/components/dashboard/widget-access-card";
import { getAddOnIconOptionsForIndustry, inferAddOnIconId } from "@/lib/addon-icons";
import { StripeConnectCard } from "@/components/dashboard/stripe-connect-card";

type Step = 1 | 2 | 3 | 4;

type StaffPayRateType = "HOURLY" | "PER_SALE" | "PER_DAY" | "PER_JOB";

type DayAvail = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

type StaffDraft = {
  localId: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  commissionPercent: string;
  payRate: string;
  payRateType: StaffPayRateType;
  inviteNow: boolean;
  invited: boolean;
  availability: DayAvail[];
};

type ServiceDraft = {
  localId: string;
  id?: string;
  name: string;
  price: string;
  billingUnit: "PER_JOB" | "PER_HOUR";
  minimumEnabled: boolean;
  minimumHours: string;
  staffLocalIds: string[];
};

type IntakeCategory = "contact" | "property" | "job" | "other";
type IntakeType = "text" | "number" | "select" | "boolean";

type IntakeOptionDraft = { id: string; value: string; label: string };

type IntakeFieldDraft = {
  id: string;
  category: IntakeCategory;
  label: string;
  placeholder: string;
  type: IntakeType;
  required: boolean;
  options: Array<Partial<IntakeOptionDraft> & Pick<IntakeOptionDraft, "value" | "label">>;
};

type AddOnDraft = { id: string; name: string; price: string; iconId?: string };

function defaultAvail(): DayAvail[] {
  return DAYS_OF_WEEK.map((d) => ({
    dayOfWeek: d.value,
    openTime: "09:00",
    closeTime: "17:00",
    isClosed: d.value === 0,
  }));
}

function keyFromLabel(label: string) {
  const base = generateSlug(label).replace(/-/g, "_");
  return base || "field";
}

function makeId(prefix: string) {
  try {
    const c = globalThis.crypto as Crypto | undefined;
    const id = c?.randomUUID?.();
    if (id) return `${prefix}_${id}`;
  } catch {
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function FieldLabel({
  label,
  help,
}: {
  label: string;
  help: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <HelpTooltip
        ariaLabel={`Help: ${label}`}
        content={
          <div className="space-y-2">
            <div className="text-sm font-semibold text-[#0b5c8b]">{label}</div>
            <div className="text-sm text-gray-600">{help}</div>
          </div>
        }
      />
    </div>
  );
}

const STEPS: Array<{ n: Step; label: string }> = [
  { n: 1, label: "Basics" },
  { n: 2, label: "Availability" },
  { n: 3, label: "Services" },
  { n: 4, label: "Launch" },
];

const INTAKE_TEMPLATES: Record<string, IntakeFieldDraft[]> = {
  cleaning_service_residential: [
    { id: "f1", category: "property", label: "Bedrooms", placeholder: "e.g. 3", type: "number", required: true, options: [] },
    { id: "f2", category: "property", label: "Bathrooms", placeholder: "e.g. 2", type: "number", required: true, options: [] },
    { id: "f3", category: "job", label: "Pets in home?", placeholder: "", type: "boolean", required: false, options: [] },
    { id: "f4", category: "job", label: "Special instructions", placeholder: "e.g. gate code, parking, preferences", type: "text", required: false, options: [] },
  ],
  cleaning_service_commercial: [
    { id: "f1", category: "property", label: "Square footage", placeholder: "e.g. 2500", type: "number", required: true, options: [] },
    { id: "f2", category: "job", label: "Service frequency", placeholder: "", type: "select", required: true, options: [
      { value: "one_time", label: "One-time" },
      { value: "weekly", label: "Weekly" },
      { value: "biweekly", label: "Bi-weekly" },
      { value: "monthly", label: "Monthly" },
    ] },
    { id: "f3", category: "job", label: "After-hours access available?", placeholder: "", type: "boolean", required: false, options: [] },
  ],
  janitorial_service: [
    { id: "f1", category: "property", label: "Square footage", placeholder: "e.g. 2500", type: "number", required: true, options: [] },
    { id: "f2", category: "job", label: "How many restrooms?", placeholder: "e.g. 2", type: "number", required: false, options: [] },
    { id: "f3", category: "job", label: "After-hours access available?", placeholder: "", type: "boolean", required: false, options: [] },
    { id: "f4", category: "job", label: "Notes / access details", placeholder: "e.g. gate code, suite, parking", type: "text", required: false, options: [] },
  ],
  hvac: [
    { id: "f1", category: "property", label: "System type", placeholder: "", type: "select", required: true, options: [
      { value: "central", label: "Central HVAC" },
      { value: "mini_split", label: "Mini-split" },
      { value: "window", label: "Window unit" },
    ] },
    { id: "f2", category: "job", label: "Issue description", placeholder: "e.g. not cooling, strange noise", type: "text", required: true, options: [] },
  ],
  tree_service: [
    { id: "f1", category: "job", label: "Tree count", placeholder: "e.g. 2", type: "number", required: true, options: [] },
    { id: "f2", category: "job", label: "Service type", placeholder: "", type: "select", required: true, options: [
      { value: "trim", label: "Trim" },
      { value: "remove", label: "Removal" },
      { value: "stump", label: "Stump grinding" },
    ] },
  ],
  default: [
    { id: "f1", category: "contact", label: "Preferred contact method", placeholder: "", type: "select", required: false, options: [
      { value: "sms", label: "Text (SMS)" },
      { value: "email", label: "Email" },
      { value: "call", label: "Phone call" },
    ] },
    { id: "f2", category: "job", label: "Notes", placeholder: "Any details we should know?", type: "text", required: false, options: [] },
  ],
};

function resolveIntakeTemplateKey(industry: string, market: "residential" | "commercial" | "both") {
  if (industry === "cleaning_service") {
    if (market === "commercial") return "cleaning_service_commercial";
    return "cleaning_service_residential";
  }
  if (industry === "janitorial_service") return "janitorial_service";
  return industry;
}

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inp =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white " +
    "placeholder:text-gray-400 focus:outline-none focus:ring-2 " +
    "focus:ring-[#0b5c8b]/20 focus:border-[#0b5c8b] transition-all";

  const go = async (fn: () => Promise<void>) => {
    setError("");
    setLoading(true);
    try {
      await fn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const [selectedTier, setSelectedTier] = useState<null | "starter" | "pro" | "elite">(null);
  const [paymentReady, setPaymentReady] = useState(false);

  const [bizName, setBizName] = useState("");
  const [industry, setIndustry] = useState("general_services");
  const [serviceMarket, setServiceMarket] = useState<"residential" | "commercial" | "both">("residential");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0b5c8b");
  const [accentColor, setAccentColor] = useState("#f5c84c");
  const [logoUrl, setLogoUrl] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");

  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [businessSlug, setBusinessSlug] = useState("");

  const [hours, setHours] = useState<DayAvail[]>(defaultAvail());
  const [staff, setStaff] = useState<StaffDraft[]>([
    {
      localId: "m1",
      name: "",
      email: "",
      phone: "",
      role: "",
      commissionPercent: "",
      payRate: "",
      payRateType: "HOURLY",
      inviteNow: false,
      invited: false,
      availability: defaultAvail(),
    },
  ]);
  const [expandedStaff, setExpandedStaff] = useState<string | null>("m1");

  const [services, setServices] = useState<ServiceDraft[]>([
    {
      localId: "s1",
      name: "",
      price: "",
      billingUnit: "PER_JOB",
      minimumEnabled: false,
      minimumHours: "2",
      staffLocalIds: ["m1"],
    },
  ]);

  const [pricingMode, setPricingMode] = useState<"simple" | "advanced">("simple");
  const [addOns, setAddOns] = useState<AddOnDraft[]>([]);
  const [intakeFields, setIntakeFields] = useState<IntakeFieldDraft[]>([]);
  // Once the user hand-edits intake questions we stop auto-swapping the
  // industry template so their work is never clobbered.
  const intakeTouchedRef = useRef(false);
  const markIntakeTouched = () => {
    intakeTouchedRef.current = true;
  };
  const [dragId, setDragId] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<null | {
    accountId: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  }>(null);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (!stepParam) return;
    const n = Number(stepParam);
    if (n === 1 || n === 2 || n === 3 || n === 4) setStep(n);
  }, [searchParams]);

  // Refresh Stripe status after returning from Stripe Connect onboarding
  useEffect(() => {
    const connectParam = searchParams.get("connect");
    if (connectParam !== "return" && connectParam !== "refresh") return;
    const refresh = async () => {
      try {
        // Sync Stripe fields on the business record
        await fetch("/api/connect/account", { method: "POST" });
        const bizRes = await fetch("/api/business");
        const bizJson = await bizRes.json();
        if (!bizRes.ok) return;
        const b = bizJson.data as {
          stripeConnectAccountId?: string | null;
          stripeChargesEnabled?: boolean;
          stripePayoutsEnabled?: boolean;
          stripeDetailsSubmitted?: boolean;
        };
        setStripeStatus({
          accountId: b.stripeConnectAccountId ?? null,
          chargesEnabled: !!b.stripeChargesEnabled,
          payoutsEnabled: !!b.stripePayoutsEnabled,
          detailsSubmitted: !!b.stripeDetailsSubmitted,
        });
      } catch {
        // silent
      }
    };
    void refresh();
  }, [searchParams]);

  useEffect(() => {
    if (businessSlug) return;
    const s = session?.user?.businessSlug;
    if (s) setBusinessSlug(s);
  }, [session, businessSlug]);

  useEffect(() => {
    if (businessSlug) return;
    const load = async () => {
      try {
        const res = await fetch("/api/business");
        const json = await res.json();
        if (!res.ok) return;
        const b = json.data as {
          name?: string;
          slug?: string;
          primaryColor?: string;
          logoUrl?: string | null;
          welcomeMessage?: string | null;
          businessHours?: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>;
          stripeConnectAccountId?: string | null;
          stripeChargesEnabled?: boolean;
          stripePayoutsEnabled?: boolean;
          stripeDetailsSubmitted?: boolean;
        };
        if (b.slug) setBusinessSlug(b.slug);
        // Don't pre-fill the auto-generated placeholder from registration
        if (!bizName && b.name && !/'s Business$/.test(b.name)) setBizName(b.name);
        if (b.primaryColor) setPrimaryColor(b.primaryColor);
        if (!logoUrl && b.logoUrl) setLogoUrl(b.logoUrl);
        if (!welcomeMessage && b.welcomeMessage) setWelcomeMessage(b.welcomeMessage);
        if (b.businessHours?.length) {
          setHours(
            DAYS_OF_WEEK.map((d) => {
              const h = b.businessHours!.find((x) => x.dayOfWeek === d.value);
              return h
                ? { dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed }
                : { dayOfWeek: d.value, openTime: "09:00", closeTime: "17:00", isClosed: d.value === 0 };
            })
          );
        }
        setStripeStatus({
          accountId: b.stripeConnectAccountId ?? null,
          chargesEnabled: !!b.stripeChargesEnabled,
          payoutsEnabled: !!b.stripePayoutsEnabled,
          detailsSubmitted: !!b.stripeDetailsSubmitted,
        });
      } catch {
      }
    };
    void load();
  }, [businessSlug, bizName, logoUrl, welcomeMessage]);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const res = await fetch("/api/billing/subscription");
        const json = await res.json();
        if (!res.ok) return;
        const sub = json.data as null | { plan?: string; status?: string; stripeSubscriptionId?: string | null };
        if (!sub?.status) return;
        // A local trial has no payment method on file — only a Stripe-backed
        // subscription (active, or trialing through Stripe) counts as ready.
        if (sub.status === "ACTIVE" || (sub.status === "TRIALING" && sub.stripeSubscriptionId)) {
          setPaymentReady(true);
        }
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

  // Hydrate existing staff/services so a reload or a return from Stripe
  // doesn't lose progress or create duplicates when steps are re-submitted.
  useEffect(() => {
    const hydrate = async () => {
      try {
        const [staffRes, svcRes] = await Promise.all([fetch("/api/staff"), fetch("/api/services")]);
        const staffJson = staffRes.ok ? await staffRes.json() : null;
        const svcJson = svcRes.ok ? await svcRes.json() : null;

        type ApiAvail = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean };
        type ApiStaff = {
          id: string; name: string | null; email: string | null; phone: string | null; role: string | null;
          commissionPercent: number | null; payRate: unknown; payRateType: StaffPayRateType | null;
          availability?: ApiAvail[];
        };
        type ApiService = {
          id: string; name: string | null; price: unknown;
          billingUnit: "PER_JOB" | "PER_HOUR" | null; minDurationMinutes: number | null;
          staff?: Array<{ staff?: { id: string } }>;
        };

        const existingStaff: ApiStaff[] = Array.isArray(staffJson?.data) ? staffJson.data : [];
        const existingServices: ApiService[] = Array.isArray(svcJson?.data) ? svcJson.data : [];

        if (existingStaff.length) {
          const drafts: StaffDraft[] = existingStaff.map((m) => ({
            localId: m.id,
            id: m.id,
            name: m.name ?? "",
            email: m.email ?? "",
            phone: m.phone ?? "",
            role: m.role ?? "",
            commissionPercent: m.commissionPercent != null ? String(m.commissionPercent) : "",
            payRate: m.payRate != null ? String(Number(m.payRate)) : "",
            payRateType: m.payRateType ?? "HOURLY",
            inviteNow: false,
            invited: false,
            availability: m.availability?.length
              ? DAYS_OF_WEEK.map((d) => {
                  const a = m.availability!.find((x) => x.dayOfWeek === d.value);
                  return a
                    ? { dayOfWeek: a.dayOfWeek, openTime: a.openTime, closeTime: a.closeTime, isClosed: a.isClosed }
                    : { dayOfWeek: d.value, openTime: "09:00", closeTime: "17:00", isClosed: true };
                })
              : defaultAvail(),
          }));
          setStaff(drafts);
          setExpandedStaff(null);
        }

        if (existingServices.length) {
          const drafts: ServiceDraft[] = existingServices.map((s) => ({
            localId: s.id,
            id: s.id,
            name: s.name ?? "",
            price: s.price != null ? String(Number(s.price)) : "",
            billingUnit: s.billingUnit ?? "PER_JOB",
            minimumEnabled: !!s.minDurationMinutes,
            minimumHours: s.minDurationMinutes ? String(Math.max(1, Math.round(s.minDurationMinutes / 60))) : "2",
            staffLocalIds: (s.staff ?? []).map((x) => x.staff?.id).filter((x): x is string => !!x),
          }));
          setServices(drafts);
        } else if (existingStaff.length) {
          setServices((prev) => prev.map((sv) => ({ ...sv, staffLocalIds: existingStaff.map((m) => m.id) })));
        }
      } catch {
      }
    };
    void hydrate();
    // Run once on mount — hydration must not clobber in-progress edits later.
  }, []);

  useEffect(() => {
    // Keep the industry template in sync until the user customizes the fields.
    if (intakeTouchedRef.current) return;
    const key = resolveIntakeTemplateKey(industry, serviceMarket);
    const preset = INTAKE_TEMPLATES[key] ?? INTAKE_TEMPLATES.default;
    setIntakeFields(
      preset.map((x, i) => {
        const fieldId = `${x.id}_${i}`;
        const options = (x.options ?? []).map((o, oi) => ({
          ...o,
          id: (o as IntakeOptionDraft).id ?? `${fieldId}_opt_${oi}`,
        }));
        return { ...x, id: fieldId, options };
      })
    );
  }, [industry, serviceMarket]);

  useEffect(() => {
    if (industry === "cleaning_service") {
      setServiceMarket("residential");
      return;
    }
    if (industry === "janitorial_service") {
      setServiceMarket("commercial");
    }
  }, [industry]);

  const submitBasics = () =>
    go(async () => {
      if (!bizName.trim()) throw new Error("Business name is required");
      if (!phone.trim()) throw new Error("Business phone is required");

      const slug = generateSlug(bizName);
      const res = await fetch("/api/business/onboard", {
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
      if (res.status === 401 || res.status === 403) {
        const callbackUrl = encodeURIComponent("/onboarding?step=1");
        window.location.assign(`/auth/login?callbackUrl=${callbackUrl}`);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to save business");
      setBusinessSlug(json.data.slug);
      setPrimaryColor(json.data.primaryColor ?? "#0b5c8b");
      setLogoUrl(json.data.logoUrl ?? "");
      setWelcomeMessage(json.data.welcomeMessage ?? "");
      await updateSession({ businessId: json.data.id, businessSlug: json.data.slug });

      setStep(2);
    });

  const startPlanCheckout = () =>
    go(async () => {
      const plan = selectedTier === "pro" ? "PROFESSIONAL" : selectedTier === "elite" ? "ENTERPRISE" : "STARTER";
      const returnTo = encodeURIComponent("/onboarding?step=1");
      const res = await fetch(
        `/api/billing/create-checkout?json=1&plan=${plan}&returnTo=${returnTo}&cancelTo=${returnTo}`,
        { headers: { accept: "application/json" } }
      );
      if (res.status === 401 || res.status === 403) {
        const callbackUrl = encodeURIComponent("/onboarding?step=1");
        window.location.assign(`/auth/login?callbackUrl=${callbackUrl}`);
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.data?.url) throw new Error(json.error ?? "Could not start checkout");
      window.location.assign(json.data.url);
    });

  const setHoursField = (day: number, k: keyof DayAvail, v: string | boolean | number) =>
    setHours((p) => p.map((h) => (h.dayOfWeek === day ? { ...h, [k]: v } : h)));

  const setStaffField = (localId: string, k: keyof StaffDraft, v: string | boolean) =>
    setStaff((p) => p.map((s) => (s.localId === localId ? { ...s, [k]: v } : s)));

  const setStaffAvail = (localId: string, day: number, k: keyof DayAvail, v: string | boolean | number) =>
    setStaff((p) =>
      p.map((s) =>
        s.localId === localId
          ? { ...s, availability: s.availability.map((a) => (a.dayOfWeek === day ? { ...a, [k]: v } : a)) }
          : s
      )
    );

  const submitAvailability = () =>
    go(async () => {
      const hoursRes = await fetch("/api/business/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      if (!hoursRes.ok) {
        const hoursJson = await hoursRes.json().catch(() => ({}));
        throw new Error(hoursJson.error ?? "Failed to save business hours");
      }

      const staffToCreate = staff.filter((s) => s.name.trim());
      if (!staffToCreate.length) throw new Error("Add at least one team member");

      const created = await Promise.all(
        staffToCreate.map(async (s) => {
          if (s.id) return { localId: s.localId, id: s.id, invited: s.invited };
          const res = await fetch("/api/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: s.name,
              email: s.email || undefined,
              phone: s.phone || undefined,
              role: s.role || undefined,
              commissionPercent: s.commissionPercent ? Math.round(Number(s.commissionPercent)) : undefined,
              payRate: s.payRate ? Number(s.payRate) : undefined,
              payRateType: s.payRateType,
              availability: s.availability,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Failed to save staff");

          let invited = s.invited;
          if (s.inviteNow && s.email.trim()) {
            const inviteRes = await fetch(`/api/staff/${json.data.id}/invite`, { method: "POST" });
            invited = inviteRes.ok;
          }

          return { localId: s.localId, id: json.data.id as string, invited };
        })
      );

      setStaff((prev) =>
        prev.map((s) => {
          const match = created.find((c) => c.localId === s.localId);
          return match ? { ...s, id: match.id, invited: match.invited } : s;
        })
      );

      setServices((prev) =>
        prev.map((x) => ({
          ...x,
          staffLocalIds: x.staffLocalIds.length ? x.staffLocalIds : staffToCreate.map((m) => m.localId),
        }))
      );

      setStep(3);
    });

  const setServiceField = (localId: string, k: keyof ServiceDraft, v: string | boolean | string[]) =>
    setServices((p) => p.map((s) => (s.localId === localId ? { ...s, [k]: v } : s)));

  const submitServices = () =>
    go(async () => {
      const staffMap = new Map(staff.filter((s) => s.id).map((s) => [s.localId, s.id as string]));
      const validStaffIds = Array.from(staffMap.values());
      if (!validStaffIds.length) throw new Error("Save at least one team member first");

      const duration = INDUSTRY_DEFAULT_SERVICE_DURATION_MINUTES[industry] ?? 60;

      const toCreate = services.filter((s) => s.name.trim());
      if (!toCreate.length) throw new Error("Add at least one service");

      const created = await Promise.all(
        toCreate.map(async (s) => {
          if (s.id) return { localId: s.localId, id: s.id };
          const staffIds =
            s.staffLocalIds.length > 0
              ? s.staffLocalIds.map((id) => staffMap.get(id)).filter(Boolean)
              : validStaffIds;
          const res = await fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: s.name,
              duration,
              price: Number(s.price || 0),
              billingUnit: s.billingUnit,
              minDurationMinutes:
                s.billingUnit === "PER_HOUR" && s.minimumEnabled ? Number(s.minimumHours) * 60 : undefined,
              color: "#0b5c8b",
              staffIds,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Failed to save service");
          return { localId: s.localId, id: json.data.id as string };
        })
      );

      setServices((prev) =>
        prev.map((s) => {
          const match = created.find((c) => c.localId === s.localId);
          return match ? { ...s, id: match.id } : s;
        })
      );

      if (pricingMode === "simple") {
        const customerTypes =
          industry === "cleaning_service" || industry === "janitorial_service"
            ? {
                enabled: serviceMarket === "both",
                options: ["residential", "commercial"],
                commercialMultiplier: 1.2,
                mode: serviceMarket,
              }
            : undefined;

        let existingConfig: Record<string, unknown> = {};
        try {
          const res = await fetch("/api/business/config");
          const json = await res.json();
          if (res.ok && json?.data?.config && typeof json.data.config === "object") {
            existingConfig = json.data.config as Record<string, unknown>;
          }
        } catch {
        }

        const existingTheme = (existingConfig.theme ?? {}) as Record<string, unknown>;
        const existingUi = (existingConfig.ui ?? {}) as Record<string, unknown>;

        const iconPool = getAddOnIconOptionsForIndustry(industry).map((o) => o.id);
        const usedIcons = new Set<string>();
        const nextAddOns = addOns
          .filter((a) => a.name.trim())
          .map((a) => {
            const key = keyFromLabel(a.name);
            const preferred = a.iconId?.trim() ? a.iconId.trim() : inferAddOnIconId(a.name);
            let iconId = preferred;
            if (!iconId || usedIcons.has(iconId)) {
              iconId = iconPool.find((id) => !usedIcons.has(id)) ?? iconId ?? "sparkles";
            }
            usedIcons.add(iconId);
            return { key, name: a.name.trim(), price: Number(a.price || 0), iconId };
          });

        const config = {
          ...existingConfig,
          ...(nextAddOns.length ? { addOns: nextAddOns } : {}),
          intakeFields: (() => {
            const usedKeys = new Set<string>();
            return intakeFields
              .filter((f) => f.label.trim())
              .map((f) => {
                const baseKey = keyFromLabel(f.label);
                let key = baseKey;
                for (let n = 2; usedKeys.has(key); n++) key = `${baseKey}_${n}`;
                usedKeys.add(key);
                const common = {
                  key,
                  label: f.label.trim(),
                  type: f.type,
                  required: f.required,
                  placeholder: f.placeholder || undefined,
                  category: f.category,
                } as Record<string, unknown>;
                if (f.type === "select") {
                  common.options = f.options
                    .filter((o) => (o.label ?? "").trim())
                    .map((o) => ({ value: o.value, label: o.label }));
                }
                return common;
              });
          })(),
          ...(customerTypes ? { customerTypes } : {}),
          theme: { ...existingTheme, accentColor },
          ui: { ...existingUi, showLivePricing: true, showIcons: true },
        };

        await fetch("/api/business/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        });
      }

      setStep(4);
    });

  const finish = () =>
    go(async () => {
      try {
        const res = await fetch("/api/business/config");
        const json = await res.json();
        if (res.ok) {
          const current = (json.data?.config ?? {}) as Record<string, unknown>;
          const theme = (current.theme ?? {}) as Record<string, unknown>;
          const ui = (current.ui ?? {}) as Record<string, unknown>;
          const next = {
            ...current,
            theme: { ...theme, accentColor },
            ui: { ...ui, showLivePricing: true, showIcons: true },
          };
          await fetch("/api/business/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: next }),
          });
        }
      } catch {
      }
      const bizRes = await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor,
          welcomeMessage: welcomeMessage.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
        }),
      });
      if (!bizRes.ok) {
        const bizJson = await bizRes.json().catch(() => ({}));
        throw new Error(bizJson.error ?? "Failed to save widget design");
      }
      const completeRes = await fetch("/api/business/onboard/complete", { method: "POST" });
      if (!completeRes.ok) {
        throw new Error("Could not complete setup. Please try again.");
      }
      router.push("/dashboard");
    });

  const stepPct = useMemo(() => {
    const idx = STEPS.findIndex((s) => s.n === step);
    return `${(idx / (STEPS.length - 1)) * 100}%`;
  }, [step]);

  const addField = () => {
    markIntakeTouched();
    setIntakeFields((p) => [
      ...p,
      { id: `f${Date.now()}`, category: "other", label: "", placeholder: "", type: "text", required: false, options: [] },
    ]);
  };

  const updateField = (id: string, patch: Partial<IntakeFieldDraft>) => {
    markIntakeTouched();
    setIntakeFields((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const reorder = (overId: string) => {
    if (!dragId || dragId === overId) return;
    markIntakeTouched();
    setIntakeFields((p) => {
      const from = p.findIndex((x) => x.id === dragId);
      const to = p.findIndex((x) => x.id === overId);
      if (from < 0 || to < 0) return p;
      const next = [...p];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDragId(null);
  };

  const grouped = useMemo(() => {
    const order: IntakeCategory[] = ["contact", "property", "job", "other"];
    return order.map((cat) => ({ cat, items: intakeFields.filter((f) => f.category === cat) }));
  }, [intakeFields]);

  return (
    <div className="w-full max-w-5xl">
      <div className="text-center mb-6">
        <Image
          src="/brand/Vertical-new-logo.webp"
          alt="Diamond Booking"
          width={150}
          height={160}
          priority
          className="h-20 w-auto mx-auto"
        />
        <div className="text-sm text-gray-500 mt-1">Let’s get your booking page live — about 3 minutes</div>
      </div>

      <div className="flex items-end justify-center gap-1 mb-6">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    done ? "bg-[#f5c84c] text-[#0b5c8b]" : active ? "bg-[#0b5c8b] text-white ring-4 ring-[#0b5c8b]/15" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : s.n}
                </div>
                <span className={`text-[10px] font-semibold hidden sm:block leading-none transition-colors ${active ? "text-[#0b5c8b]" : done ? "text-[#f5c84c]" : "text-gray-300"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-6 sm:w-10 h-0.5 rounded-full mb-5 transition-colors duration-300 ${done ? "bg-[#f5c84c]" : "bg-gray-100"}`} />}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-gray-100/60 overflow-hidden">
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-gradient-to-r from-[#0b5c8b] to-[#f5c84c] transition-all duration-500" style={{ width: stepPct }} />
        </div>

        <div className="p-7">
          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#0b5c8b] mb-1">Basics</h2>
                <p className="text-sm text-gray-500">Choose a plan (optional), then set your business details. You can add a payment method anytime during your trial.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: "starter" as const, name: "Starter", price: "$29/mo", features: ["Online booking", "Staff management", "Basic widget"] },
                  { key: "pro" as const, name: "Professional", price: "$59/mo", features: ["Advanced automations", "Priority support", "More limits"] },
                  { key: "elite" as const, name: "Elite", price: "$119/mo", features: ["Highest limits", "Multi-location ready", "Premium support"] },
                ].map((p) => {
                  const active = selectedTier === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setSelectedTier(p.key)}
                      className={`text-left p-4 rounded-2xl border transition-all ${active ? "border-[#0b5c8b] ring-4 ring-[#0b5c8b]/10 bg-white" : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-[#0b5c8b]">{p.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{p.price}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${active ? "border-[#0b5c8b] bg-[#0b5c8b]" : "border-gray-300 bg-white"}`}>
                          {active && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {p.features.map((f) => (
                          <li key={f} className="text-xs text-gray-600 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#f5c84c]" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <FieldLabel label="Business name" help="Use the name customers recognize. This shows on your booking page and messages." />
                  <input
                    className={inp}
                    placeholder="e.g. Diamond Cleaners USA"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel label="Industry" help="This helps pre-fill recommended booking questions and defaults." />
                  <select className={inp + " appearance-none"} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    {INDUSTRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(industry === "cleaning_service" || industry === "janitorial_service") && (
                  <div className="col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-[#0b5c8b]">Do you serve residential or commercial clients?</div>
                      <HelpTooltip
                        ariaLabel="Help: Residential vs commercial"
                        content={
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-[#0b5c8b]">Residential vs commercial</div>
                            <div className="text-sm text-gray-600">
                              This helps us pre-fill the right booking questions and pricing defaults. You can change it later.
                            </div>
                          </div>
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setServiceMarket("residential")}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          serviceMarket === "residential" ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                        }`}
                        style={serviceMarket === "residential" ? { background: "#0b5c8b" } : {}}
                      >
                        Residential
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceMarket("commercial")}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          serviceMarket === "commercial" ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                        }`}
                        style={serviceMarket === "commercial" ? { background: "#0b5c8b" } : {}}
                      >
                        Commercial
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceMarket("both")}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          serviceMarket === "both" ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                        }`}
                        style={serviceMarket === "both" ? { background: "#0b5c8b" } : {}}
                      >
                        Both
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <FieldLabel label="Business phone" help="Used for customer questions and confirmations. Use a number you answer." />
                  <input className={inp} placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <FieldLabel label="Time zone" help="Appointments and reminders use this time zone. Choose where services happen." />
                  <select className={inp + " appearance-none"} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {TIMEZONE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <FieldLabel label="Street address" help="Start typing and select your address. We’ll fill city/state/zip automatically." />
                  <AddressAutocomplete
                    value={address1}
                    onChange={setAddress1}
                    onSelect={(v) => {
                      setAddress1(v.street);
                      setCity(v.city);
                      setState(v.state);
                      setZip(v.zip);
                    }}
                    className={inp}
                    placeholder="Start typing your address…"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="City" help="Auto-filled from the selected address. You can edit it." />
                  <input className={inp} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="State" help="Auto-filled from the selected address. Use the state/province abbreviation." />
                  <input className={inp} value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="ZIP" help="Auto-filled from the selected address. You can edit it." />
                  <input className={inp} value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Website (optional)" help="Shown in emails and your booking page footer." />
                  <input className={inp} placeholder="https://…" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <FieldLabel label="Description (optional)" help="A short line customers see before booking." />
                  <textarea className={inp + " resize-none"} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={submitBasics}
                  disabled={loading}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 bg-[#0b5c8b] text-white hover:bg-[#0b5c8b]/90 disabled:opacity-50"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
                {!paymentReady && (
                  <button
                    type="button"
                    onClick={startPlanCheckout}
                    disabled={loading}
                    className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-[#0b5c8b] hover:bg-gray-50 disabled:opacity-50"
                  >
                    Add payment method
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#0b5c8b] mb-1">Availability</h2>
                <p className="text-sm text-gray-500">Set business hours and add at least one team member so the booking page shows available times.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[#0b5c8b]">Business hours</div>
                  <HelpTooltip
                    ariaLabel="Help: Business hours"
                    content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Business hours</div><div className="text-sm text-gray-600">Customers can only book inside these windows.</div></div>}
                  />
                </div>
                {hours.map((h) => {
                  const day = DAYS_OF_WEEK.find((d) => d.value === h.dayOfWeek)!;
                  return (
                    <div key={h.dayOfWeek} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${h.isClosed ? "bg-gray-50" : "bg-white border border-gray-100"}`}>
                      <span className={`w-20 text-sm font-semibold shrink-0 ${h.isClosed ? "text-gray-400" : "text-gray-700"}`}>{day.label}</span>
                      <button
                        type="button"
                        onClick={() => setHoursField(h.dayOfWeek, "isClosed", !h.isClosed)}
                        className={`w-10 h-6 rounded-full relative transition-colors ${h.isClosed ? "bg-gray-200" : "bg-[#0b5c8b]"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${h.isClosed ? "translate-x-0.5" : "translate-x-4"}`} />
                      </button>
                      {!h.isClosed ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={h.openTime} onChange={(e) => setHoursField(h.dayOfWeek, "openTime", e.target.value)} className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0b5c8b]" />
                          <span className="text-gray-400 text-xs shrink-0">to</span>
                          <input type="time" value={h.closeTime} onChange={(e) => setHoursField(h.dayOfWeek, "closeTime", e.target.value)} className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0b5c8b]" />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[#0b5c8b]">Team members</div>
                  <HelpTooltip
                    ariaLabel="Help: Team members"
                    content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Team members</div><div className="text-sm text-gray-600">Availability comes from staff schedules. If nobody is available, customers see no time slots.</div></div>}
                  />
                </div>

                <div className="space-y-3">
                  {staff.map((m) => {
                    const open = expandedStaff === m.localId;
                    return (
                      <div key={m.localId} className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center gap-3 p-4 bg-gray-50/60 cursor-pointer" onClick={() => setExpandedStaff(open ? null : m.localId)}>
                          <div className="w-9 h-9 rounded-full bg-[#0b5c8b]/10 flex items-center justify-center text-sm font-bold text-[#0b5c8b] shrink-0">
                            {m.name ? m.name[0].toUpperCase() : <Users className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <input className={inp} placeholder="Full name *" value={m.name} onChange={(e) => setStaffField(m.localId, "name", e.target.value)} onClick={(e) => e.stopPropagation()} />
                            <input className={inp} placeholder="Email (optional)" value={m.email} onChange={(e) => setStaffField(m.localId, "email", e.target.value)} onClick={(e) => e.stopPropagation()} />
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {staff.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStaff((p) => p.filter((s) => s.localId !== m.localId));
                                  setServices((p) => p.map((sv) => ({ ...sv, staffLocalIds: sv.staffLocalIds.filter((id) => id !== m.localId) })));
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                          </div>
                        </div>

                        {open && (
                          <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3 bg-white">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <FieldLabel label="Role (optional)" help="Internal label like Technician, Cleaner, Stylist." />
                                <input className={inp} value={m.role} onChange={(e) => setStaffField(m.localId, "role", e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <FieldLabel label="Commission % (optional)" help="Leave blank if you don’t track commission payouts." />
                                <input className={inp} inputMode="numeric" value={m.commissionPercent} onChange={(e) => setStaffField(m.localId, "commissionPercent", e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <FieldLabel label="Phone (optional)" help="Internal contact number for scheduling changes." />
                                <input className={inp} value={m.phone} onChange={(e) => setStaffField(m.localId, "phone", e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <FieldLabel label="Pay rate (optional)" help="Set a default pay rate for reporting. You can refine later." />
                                <div className="grid grid-cols-2 gap-2">
                                  <input className={inp} inputMode="decimal" placeholder="0.00" value={m.payRate} onChange={(e) => setStaffField(m.localId, "payRate", e.target.value)} />
                                  <select className={inp + " appearance-none"} value={m.payRateType} onChange={(e) => setStaffField(m.localId, "payRateType", e.target.value as StaffPayRateType)}>
                                    <option value="HOURLY">Per hour</option>
                                    <option value="PER_SALE">Per sale</option>
                                    <option value="PER_DAY">Per day</option>
                                    <option value="PER_JOB">Per job</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invite this employee</div>
                                <HelpTooltip
                                  ariaLabel="Help: Invite employee"
                                  content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Invite employee</div><div className="text-sm text-gray-600">If you add an email, we can send an invite so they can access their own schedule later.</div></div>}
                                />
                              </div>
                              <label className="text-sm flex items-center gap-2">
                                <input type="checkbox" checked={m.inviteNow} onChange={(e) => setStaffField(m.localId, "inviteNow", e.target.checked)} />
                                Send invite now
                              </label>
                            </div>
                            {m.invited && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!m.id) return;
                                  void fetch(`/api/staff/${m.id}/invite`, { method: "POST" });
                                }}
                                className="text-xs font-bold text-[#0b5c8b] hover:underline"
                              >
                                Resend invite
                              </button>
                            )}

                            <div className="pt-2">
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Weekly availability</div>
                                <HelpTooltip
                                  ariaLabel="Help: Weekly availability"
                                  content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Weekly availability</div><div className="text-sm text-gray-600">If a team member is “off”, they won’t be considered for time slots on that day.</div></div>}
                                />
                              </div>
                              <div className="mt-2 space-y-2">
                                {m.availability.map((a) => {
                                  const day = DAYS_OF_WEEK.find((d) => d.value === a.dayOfWeek)!;
                                  return (
                                    <div key={a.dayOfWeek} className="flex items-center gap-3">
                                      <span className={`w-12 text-xs font-semibold shrink-0 ${a.isClosed ? "text-gray-400" : "text-gray-600"}`}>{day.short}</span>
                                      <button
                                        type="button"
                                        onClick={() => setStaffAvail(m.localId, a.dayOfWeek, "isClosed", !a.isClosed)}
                                        className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${a.isClosed ? "bg-gray-200" : "bg-[#0b5c8b]"}`}
                                      >
                                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${a.isClosed ? "translate-x-0.5" : "translate-x-4"}`} />
                                      </button>
                                      {!a.isClosed ? (
                                        <div className="flex items-center gap-1.5 flex-1">
                                          <input type="time" value={a.openTime} onChange={(e) => setStaffAvail(m.localId, a.dayOfWeek, "openTime", e.target.value)} className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#0b5c8b]" />
                                          <span className="text-gray-400 text-xs shrink-0">–</span>
                                          <input type="time" value={a.closeTime} onChange={(e) => setStaffAvail(m.localId, a.dayOfWeek, "closeTime", e.target.value)} className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#0b5c8b]" />
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-400">Off</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      const id = `m${Date.now()}`;
                      setStaff((p) => [
                        ...p,
                        {
                          localId: id,
                          name: "",
                          email: "",
                          phone: "",
                          role: "",
                          commissionPercent: "",
                          payRate: "",
                          payRateType: "HOURLY",
                          inviteNow: false,
                          invited: false,
                          availability: defaultAvail(),
                        },
                      ]);
                      setExpandedStaff(id);
                    }}
                    className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#0b5c8b]/30 hover:text-[#0b5c8b] transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add another team member
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button type="button" onClick={submitAvailability} disabled={loading} className="flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 bg-[#0b5c8b] text-white hover:bg-[#0b5c8b]/90 disabled:opacity-50">
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#0b5c8b] mb-1">Services & pricing</h2>
                <p className="text-sm text-gray-500">Add what customers can book. Duration is set to a recommended default for your industry and can be edited later.</p>
              </div>

              <div className="space-y-3">
                {services.map((s) => (
                  <div key={s.localId} className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="space-y-1">
                          <FieldLabel label="Service name" help="Use customer-friendly names like “Deep Cleaning” or “AC Tune-up”." />
                          <input className={inp} placeholder="Service name" value={s.name} onChange={(e) => setServiceField(s.localId, "name", e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <FieldLabel label="Price" help="Base price before add-ons or discounts." />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input className={inp + " pl-7"} type="number" min="0" step="0.01" placeholder="0.00" value={s.price} onChange={(e) => setServiceField(s.localId, "price", e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <FieldLabel label="Billing" help="Per job is a flat rate. Per hour scales with duration." />
                            <select className={inp + " appearance-none"} value={s.billingUnit} onChange={(e) => setServiceField(s.localId, "billingUnit", e.target.value as "PER_JOB" | "PER_HOUR")}>
                              <option value="PER_JOB">Per job</option>
                              <option value="PER_HOUR">Per hour</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <FieldLabel label="Who can perform it?" help="Select which team members can take this service. This controls availability." />
                            <div className="rounded-xl border border-gray-200 bg-white p-2 space-y-1 max-h-28 overflow-auto">
                              {staff.map((m) => (
                                <label key={m.localId} className="flex items-center gap-2 text-xs text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={s.staffLocalIds.includes(m.localId)}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? Array.from(new Set([...s.staffLocalIds, m.localId]))
                                        : s.staffLocalIds.filter((x) => x !== m.localId);
                                      setServiceField(s.localId, "staffLocalIds", next);
                                    }}
                                  />
                                  <span className="truncate">{m.name || "Team member"}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {s.billingUnit === "PER_HOUR" && (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-gray-100">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-gray-800">Minimum hours</div>
                                <HelpTooltip ariaLabel="Help: Minimum hours" content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Minimum hours</div><div className="text-sm text-gray-600">Prevents bookings that are too short. Example: 2 hours minimum.</div></div>} />
                              </div>
                              <div className="text-xs text-gray-500">Optional. If enabled, customers must book at least this many hours.</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button type="button" onClick={() => setServiceField(s.localId, "minimumEnabled", !s.minimumEnabled)} className={`w-10 h-6 rounded-full relative transition-colors ${s.minimumEnabled ? "bg-[#0b5c8b]" : "bg-gray-200"}`}>
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${s.minimumEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                              </button>
                              <input className={inp + " w-24"} type="number" min="1" step="1" disabled={!s.minimumEnabled} value={s.minimumHours} onChange={(e) => setServiceField(s.localId, "minimumHours", e.target.value)} />
                            </div>
                          </div>
                        )}
                      </div>

                      {services.length > 1 && (
                        <button type="button" onClick={() => setServices((p) => p.filter((x) => x.localId !== s.localId))} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-1 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const id = `s${Date.now()}`;
                    setServices((p) => [
                      ...p,
                      {
                        localId: id,
                        name: "",
                        price: "",
                        billingUnit: "PER_JOB",
                        minimumEnabled: false,
                        minimumHours: "2",
                        staffLocalIds: staff.map((m) => m.localId),
                      },
                    ]);
                  }}
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#0b5c8b]/30 hover:text-[#0b5c8b] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add another service
                </button>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#0b5c8b]">Pricing & intake</div>
                    <div className="text-xs text-gray-500">Keep it simple: add a few optional add-ons and booking questions. Advanced rules are optional.</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <button type="button" onClick={() => setPricingMode("simple")} className={`px-2 py-1 rounded-lg border ${pricingMode === "simple" ? "bg-white border-gray-200" : "border-transparent hover:border-gray-200"}`}>Simple</button>
                    <button type="button" onClick={() => setPricingMode("advanced")} className={`px-2 py-1 rounded-lg border ${pricingMode === "advanced" ? "bg-white border-gray-200" : "border-transparent hover:border-gray-200"}`}>Advanced</button>
                  </div>
                </div>

                {pricingMode === "simple" && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-800">Add-ons</div>
                          <HelpTooltip ariaLabel="Help: Add-ons" content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Add-ons</div><div className="text-sm text-gray-600">Optional upsells customers can add during booking (flat fee for now).</div></div>} />
                        </div>
                        <button type="button" onClick={() => setAddOns((p) => [...p, { id: `a${Date.now()}`, name: "", price: "", iconId: undefined }])} className="text-xs font-bold text-[#0b5c8b] hover:underline">
                          + Add add-on
                        </button>
                      </div>
                      <div className="space-y-2">
                        {addOns.map((a) => (
                          <div key={a.id} className="grid grid-cols-1 md:grid-cols-[1fr_140px_180px_32px] gap-2 items-center">
                            <input
                              className={inp}
                              placeholder="e.g. Inside fridge cleaning"
                              value={a.name}
                              onChange={(e) => {
                                const nextName = e.target.value;
                                setAddOns((p) =>
                                  p.map((x) => {
                                    if (x.id !== a.id) return x;
                                    if (x.iconId) return { ...x, name: nextName };
                                    const inferred = inferAddOnIconId(nextName);
                                    return { ...x, name: nextName, ...(inferred ? { iconId: inferred } : {}) };
                                  })
                                );
                              }}
                            />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input className={inp + " pl-7"} inputMode="decimal" placeholder="0.00" value={a.price} onChange={(e) => setAddOns((p) => p.map((x) => (x.id === a.id ? { ...x, price: e.target.value } : x)))} />
                            </div>
                            <select
                              className={inp + " appearance-none"}
                              value={a.iconId ?? ""}
                              onChange={(e) => {
                                const v = e.target.value.trim();
                                setAddOns((p) => p.map((x) => (x.id === a.id ? { ...x, iconId: v || undefined } : x)));
                              }}
                            >
                              <option value="">Auto icon</option>
                              {getAddOnIconOptionsForIndustry(industry).map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <button type="button" onClick={() => setAddOns((p) => p.filter((x) => x.id !== a.id))} className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {addOns.length === 0 && <div className="text-xs text-gray-500">No add-ons yet. Most businesses start with 1–3.</div>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-800">Customer intake fields</div>
                          <HelpTooltip ariaLabel="Help: Customer intake fields" content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Customer intake fields</div><div className="text-sm text-gray-600">These are questions customers answer while booking. Drag to reorder.</div></div>} />
                        </div>
                        <button type="button" onClick={addField} className="text-xs font-bold text-[#0b5c8b] hover:underline">
                          + Add field
                        </button>
                      </div>

                      <div className="space-y-3">
                        {grouped.map(({ cat, items }) => (
                          <div key={cat} className="space-y-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              {cat === "contact" ? "Contact" : cat === "property" ? "Property" : cat === "job" ? "Job details" : "Other"}
                            </div>
                            <div className="space-y-2">
                              {items.map((f) => (
                                <div
                                  key={f.id}
                                  draggable
                                  onDragStart={() => setDragId(f.id)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => reorder(f.id)}
                                  className="rounded-xl border border-gray-200 bg-white p-3 space-y-2"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_140px_90px_32px] gap-2 items-center">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs font-semibold text-gray-700">Question</div>
                                        <HelpTooltip ariaLabel="Help: Question label" content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Question</div><div className="text-sm text-gray-600">This is exactly what customers see.</div></div>} />
                                      </div>
                                      <input className={inp} placeholder="e.g. Bedrooms" value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs font-semibold text-gray-700">Type</div>
                                        <HelpTooltip ariaLabel="Help: Field type" content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Type</div><div className="text-sm text-gray-600">Controls how customers answer (text, number, dropdown, yes/no).</div></div>} />
                                      </div>
                                      <select
                                        className={inp + " appearance-none"}
                                        value={f.type}
                                        onChange={(e) => {
                                          const nextType = e.target.value as IntakeType;
                                          if (nextType === "select") {
                                            const nextOptions = f.options.length
                                              ? f.options
                                              : [{ id: makeId("opt"), value: "opt_1", label: "" }];
                                            updateField(f.id, { type: nextType, options: nextOptions });
                                            return;
                                          }
                                          updateField(f.id, { type: nextType, options: [] });
                                        }}
                                      >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="select">Dropdown</option>
                                        <option value="boolean">Yes/No</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs font-semibold text-gray-700">Placeholder</div>
                                        <HelpTooltip ariaLabel="Help: Placeholder" content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Placeholder</div><div className="text-sm text-gray-600">Example text customers see inside the input.</div></div>} />
                                      </div>
                                      <input className={inp} placeholder="e.g. 3" value={f.placeholder} onChange={(e) => updateField(f.id, { placeholder: e.target.value })} />
                                    </div>
                                    <label className="flex items-center gap-2 text-xs text-gray-700 pt-5 md:pt-0">
                                      <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} />
                                      Required
                                    </label>
                                    <button type="button" onClick={() => { markIntakeTouched(); setIntakeFields((p) => p.filter((x) => x.id !== f.id)); }} className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center mt-4 md:mt-0">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {f.type === "select" && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="text-xs font-semibold text-gray-700">Dropdown options</div>
                                          <HelpTooltip ariaLabel="Help: Dropdown options" content={<div className="space-y-2"><div className="text-sm font-semibold text-[#0b5c8b]">Dropdown options</div><div className="text-sm text-gray-600">These are the choices customers can pick.</div></div>} />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateField(f.id, {
                                              options: [
                                                ...f.options,
                                                { id: makeId("opt"), value: `opt_${f.options.length + 1}`, label: "" },
                                              ],
                                            })
                                          }
                                          className="text-xs font-bold text-[#0b5c8b] hover:underline"
                                        >
                                          + Add option
                                        </button>
                                      </div>
                                      <div className="space-y-2">
                                        {f.options.map((o, idx) => (
                                          <div key={(o as IntakeOptionDraft).id ?? `${f.id}_opt_${idx}`} className="grid grid-cols-[1fr_32px] gap-2 items-center">
                                            <input
                                              className={inp}
                                              placeholder={`Option ${idx + 1}`}
                                              value={o.label}
                                              onChange={(e) => {
                                                const next = [...f.options];
                                                const nextLabel = e.target.value;
                                                const nextValue = generateSlug(nextLabel).replace(/-/g, "_") || next[idx]?.value || `opt_${idx + 1}`;
                                                next[idx] = { ...next[idx], label: nextLabel, value: nextValue };
                                                updateField(f.id, { options: next });
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = [...f.options];
                                                next.splice(idx, 1);
                                                updateField(f.id, { options: next.length ? next : [{ id: makeId("opt"), value: "opt_1", label: "" }] });
                                              }}
                                              className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {items.length === 0 && <div className="text-xs text-gray-500">No fields in this category.</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {pricingMode === "advanced" && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <PricingBuilder />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button type="button" onClick={submitServices} disabled={loading} className="flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 bg-[#0b5c8b] text-white hover:bg-[#0b5c8b]/90 disabled:opacity-50">
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f5c84c] to-amber-300 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-200/60">
                  <CheckCheck className="w-8 h-8 text-[#0b5c8b]" />
                </div>
                <h2 className="text-xl font-bold text-[#0b5c8b] mb-1">You’re live</h2>
                <p className="text-sm text-gray-500">Copy your booking link or embed the widget on your site.</p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#0b5c8b]">Widget design</div>
                    <div className="text-xs text-gray-500">Set your brand color and logo. You can change this later in Settings.</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel label="Primary color" help="Used for buttons and key accents in the booking widget." />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-12 rounded-lg border border-gray-200 bg-white"
                      />
                      <input
                        className={inp}
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#0b5c8b"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel label="Accent color (optional)" help="Used for highlights like badges, dividers, and secondary emphasis." />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-10 w-12 rounded-lg border border-gray-200 bg-white"
                      />
                      <input
                        className={inp}
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        placeholder="#f5c84c"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel label="Logo URL (optional)" help="Paste a direct image URL (PNG/JPG/WebP). This shows on your booking page." />
                    <input className={inp} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel label="Welcome message (optional)" help="Short sentence shown at the top of your booking page." />
                    <input className={inp} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="e.g. Book your cleaning in 60 seconds" />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  {businessSlug ? (
                    <WidgetAccessCard
                      slug={businessSlug}
                      design={{ primaryColor, accentColor, logoUrl, welcomeMessage }}
                    />
                  ) : (
                    <div className="p-4 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">Saving your business…</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Accept payments</p>
                <StripeConnectCard
                  status={stripeStatus}
                  returnTo="/onboarding?step=4&connect=return"
                  refreshTo="/onboarding?step=4&connect=refresh"
                />
              </div>

              <div className="p-4 bg-gradient-to-br from-[#0b5c8b]/5 to-[#f5c84c]/5 rounded-xl border border-[#f5c84c]/20">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Setup summary</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    `${services.filter((s) => s.name.trim()).length} service${services.filter((s) => s.name.trim()).length !== 1 ? "s" : ""}`,
                    `${staff.filter((s) => s.name.trim()).length} team member${staff.filter((s) => s.name.trim()).length !== 1 ? "s" : ""}`,
                    "Online booking page",
                    "Live booking widget",
                    "Customer questions (optional)",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-gray-700">
                      <Check className="w-3.5 h-3.5 text-[#f5c84c] shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button type="button" onClick={finish} disabled={loading} className="flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-[#f5c84c] to-amber-400 text-[#0b5c8b] hover:shadow-lg hover:shadow-amber-200 disabled:opacity-50">
                  Finish setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center pt-5 text-xs text-gray-400 flex items-center justify-center gap-2">
        <HelpCircle className="w-4 h-4" /> You can edit everything later in Settings, Staff, Services, and Pricing.
      </div>
    </div>
  );
}
