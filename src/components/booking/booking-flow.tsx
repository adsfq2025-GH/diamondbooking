// src/components/booking/booking-flow.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Apple,
  AppWindow,
  Blinds,
  Bug,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CookingPot,
  DoorClosed,
  Droplets,
  Fence,
  Fan,
  FileText,
  Filter,
  Flame,
  Gem,
  HelpCircle,
  Home,
  Images,
  Leaf,
  Microwave,
  Package,
  Refrigerator,
  Repeat,
  Scissors,
  ShowerHead,
  Shield,
  Sofa,
  SprayCan,
  Sparkles,
  Star,
  Trees,
  Truck,
  Utensils,
  Warehouse,
  Wind,
} from "lucide-react";
import { formatTimeDisplay } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { useSearchParams } from "next/navigation";

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
  billingUnit: "PER_JOB" | "PER_HOUR";
  minDurationMinutes: number | null;
  staff: StaffMember[];
}

interface SlotData { startTime: string; endTime: string; startUTC: string; endUTC: string; staffId: string }

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface BookingSelection {
  service: ServiceData | null;
  staff:   StaffMember | null;
  date:    string;
  slot:    SlotData | null;
  durationMinutes: number;
  name:    string; email: string; phone: string; notes: string;
}

type BookingConfig = {
  addOns?: Array<{ key: string; name: string; price: number; extraMinutes?: number; iconId?: string }>;
  intakeFields?: Array<{
    key: string;
    label: string;
    type: "text" | "number" | "select" | "boolean";
    required?: boolean;
    placeholder?: string;
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
  theme?: { accentColor?: string };
  ui?: { showIcons?: boolean; showLivePricing?: boolean };
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

function ymdToDateNoonUTC(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((n) => Number(n));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function formatYmdInTimeZone(dateStr: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const dt = ymdToDateNoonUTC(dateStr);
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(dt);
}

function toIcsUtc(tsUtc: string) {
  const d = new Date(tsUtc);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function icsEscape(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, " ");
}

function makeIcs(opts: { uid: string; summary: string; description?: string; startUtc: string; endUtc: string }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Diamond Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(opts.startUtc)}`,
    `DTEND:${toIcsUtc(opts.endUtc)}`,
    `SUMMARY:${icsEscape(String(opts.summary))}`,
    opts.description ? `DESCRIPTION:${icsEscape(String(opts.description))}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

function formatDateToYmdInTimeZone(dt: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(dt);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

const WEEKDAY_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function weekdayIndexInTimeZone(dateStr: string, timeZone: string) {
  const dt = ymdToDateNoonUTC(dateStr);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(dt);
  return WEEKDAY_TO_INDEX[weekday] ?? dt.getUTCDay();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BookingFlow({
  business,
  services,
  config,
  embed = false,
}: {
  business: BusinessData;
  services: ServiceData[];
  config: unknown;
  embed?: boolean;
}) {
  const searchParams = useSearchParams();
  const primary = business.primaryColor || "#0b5c8b";
  const cfg = (config ?? {}) as BookingConfig;
  const showIcons = cfg.ui?.showIcons !== false;
  const showLivePricing = cfg.ui?.showLivePricing !== false;
  const accent = cfg.theme?.accentColor ?? "#f5c84c";

  const addOnIconMap = useMemo(
    () => ({
      apple: Apple,
      blinds: Blinds,
      bug: Bug,
      clock: Clock,
      "door-closed": DoorClosed,
      fan: Fan,
      refrigerator: Refrigerator,
      microwave: Microwave,
      "cooking-pot": CookingPot,
      droplets: Droplets,
      "app-window": AppWindow,
      fence: Fence,
      "file-text": FileText,
      filter: Filter,
      flame: Flame,
      home: Home,
      images: Images,
      gem: Gem,
      leaf: Leaf,
      package: Package,
      repeat: Repeat,
      scissors: Scissors,
      "shower-head": ShowerHead,
      shield: Shield,
      sofa: Sofa,
      "spray-can": SprayCan,
      sparkles: Sparkles,
      trees: Trees,
      truck: Truck,
      utensils: Utensils,
      warehouse: Warehouse,
      wind: Wind,
    }),
    []
  );

  const renderAddOnIcon = (iconId?: string) => {
    if (!showIcons) return null;
    const key = (iconId ?? "").trim();
    const Icon = (addOnIconMap as Record<string, typeof Refrigerator>)[key];
    if (!Icon) return null;
    return <Icon className="w-4 h-4" />;
  };
  const intakeFields = (cfg.intakeFields ?? []).filter((f) => f.key !== "customerType");
  const addOns = cfg.addOns ?? [];
  const recurring = cfg.recurring?.enabled ? cfg.recurring : undefined;
  const customerTypes = cfg.customerTypes?.enabled ? cfg.customerTypes : undefined;
  const customerTypesMode =
    customerTypes?.options?.includes("residential") && customerTypes?.options?.includes("commercial")
      ? "both"
      : customerTypes?.options?.includes("commercial")
        ? "commercial"
        : "residential";
  const showCustomerTypeToggle = !!customerTypes && customerTypesMode === "both";

  const [step, setStep]       = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots]     = useState<SlotData[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingId, setBookingId]       = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<null | { serviceName: string; startTime: string; endTime: string; customerEmail: string }>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [lastPaymentSessionId, setLastPaymentSessionId] = useState<string | null>(null);
  const [error, setError]     = useState("");

  const [intake, setIntake] = useState<Record<string, unknown>>({});
  const [addOnKeys, setAddOnKeys] = useState<string[]>([]);
  const [isCommercial, setIsCommercial] = useState(customerTypesMode === "commercial");
  const [recurringInterval, setRecurringInterval] = useState<string>("");
  const [promoCode, setPromoCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const [sel, setSel] = useState<BookingSelection>({
    service: null, staff: null, date: "", slot: null,
    durationMinutes: 60,
    name: "", email: "", phone: "", notes: "",
  });

  // Load slots when date + service + staff are selected
  const loadSlots = useCallback(async (date: string, serviceId: string, staffId: string, durationMinutes: number) => {
    setSlotsLoading(true);
    try {
      const res = await fetch(
        `/api/public/availability/${business.slug}?date=${date}&serviceId=${serviceId}&staffId=${staffId}&durationMinutes=${encodeURIComponent(String(durationMinutes))}`
      );
      let json: any = null;
      try {
        json = await res.json();
      } catch {}
      if (!res.ok) throw new Error(json?.error ?? "Failed to load availability");
      setSlots(json.data ?? []);
      setError("");
    } catch (e: unknown) {
      setSlots([]);
      setError(e instanceof Error ? e.message : "Failed to load availability");
    } finally {
      setSlotsLoading(false);
    }
  }, [business.slug]);

  useEffect(() => {
    if (sel.date && sel.service && step === 3) {
      loadSlots(sel.date, sel.service.id, sel.staff?.id ?? "any", sel.durationMinutes);
    }
  }, [sel.date, sel.service, sel.staff, sel.durationMinutes, step, loadSlots]);

  // Check if a date is available (within business hours, not in past, within advance window)
  const isDateAvailable = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const tz = business.timezone || "UTC";
    const todayStr = formatDateToYmdInTimeZone(new Date(), tz);
    const maxDate = new Date(ymdToDateNoonUTC(todayStr).getTime() + business.advanceBookingDays * 86400000);
    const maxStr = formatDateToYmdInTimeZone(maxDate, tz);
    if (dateStr < todayStr || dateStr > maxStr) return false;
    const dow = weekdayIndexInTimeZone(dateStr, tz);
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
          durationMinutes: sel.durationMinutes,
          customerName:  sel.name,
          customerEmail: sel.email,
          customerPhone: sel.phone || undefined,
          notes:         sel.notes || undefined,
          intake,
          addOnKeys,
          isCommercial,
          recurringInterval: recurringInterval || undefined,
          promoCode: promoCode.trim() || undefined,
          embed,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Booking failed");
      const id = String(json?.data?.bookingId ?? "");
      setBookingId(id || null);
      const status = typeof json?.data?.status === "string" ? json.data.status : null;
      setBookingStatus(status);
      const paymentRequired = !!json?.data?.payment?.required;
      const url = typeof json?.data?.payment?.checkoutUrl === "string" ? json.data.payment.checkoutUrl : null;
      setCheckoutUrl(url);
      if (embed && id) {
        window.parent.postMessage(
          {
            type: "db:lead-created",
            bookingId: id,
            businessSlug: business.slug,
            status,
            paymentRequired,
          },
          "*"
        );
      }
      if (paymentRequired) {
        setStep(5);
        if (!url) {
          setError(typeof json?.data?.payment?.error === "string" ? json.data.payment.error : "Payment collection is currently unavailable");
        }
      } else {
        setStep(6);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const payment = searchParams.get("payment");
    const returnedBookingId = searchParams.get("bookingId");
    const sessionId = searchParams.get("session_id");

    if (payment === "cancel" && returnedBookingId) {
      setBookingId(returnedBookingId);
      setCheckoutUrl(null);
      setStep(5);
      setError("Payment was cancelled. You can complete payment to confirm your booking.");
      return;
    }

    if (payment !== "success" || !returnedBookingId || !sessionId) return;

    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await fetch("/api/public/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: returnedBookingId, sessionId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) throw new Error(json?.error ?? "Payment confirmation failed");
        setBookingId(returnedBookingId);
        setLastPaymentSessionId(sessionId);
        setBookingStatus(typeof json?.data?.status === "string" ? json.data.status : null);
        setConfirmed({
          serviceName: String(json?.data?.serviceName ?? ""),
          startTime: String(json?.data?.startTime ?? ""),
          endTime: String(json?.data?.endTime ?? ""),
          customerEmail: String(json?.data?.customerEmail ?? ""),
        });
        setStep(6);
      } catch (e: unknown) {
        if (!alive) return;
        setBookingId(returnedBookingId);
        setStep(5);
        setError(e instanceof Error ? e.message : "Payment confirmation failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [searchParams]);

  // Auto-resize the parent iframe when embedded
  useEffect(() => {
    if (!embed) return;
    const sendHeight = () => {
      const h = document.documentElement.scrollHeight || document.body.scrollHeight;
      window.parent.postMessage({ type: "db:resize", height: h }, "*");
    };
    sendHeight();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sendHeight) : null;
    if (ro) ro.observe(document.body);
    return () => { if (ro) ro.disconnect(); };
  }, [embed, step]);

  useEffect(() => {
    if (!showLivePricing) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
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
            durationMinutes: sel.durationMinutes,
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
    const t = window.setTimeout(() => void load(), 250);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [showLivePricing, sel.service, sel.durationMinutes, sel.email, business.slug, intake, addOnKeys, isCommercial, recurringInterval, promoCode]);

  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all"
            + ` focus:ring-[${primary}]/20`;

  const currency = quote?.currency ?? business.currency;
  const base =
    sel.service
      ? sel.service.billingUnit === "PER_HOUR"
        ? sel.service.price * (sel.durationMinutes / 60)
        : sel.service.price
      : 0;
  const total = quote ? quote.total : base;
  const subtotal = quote ? quote.subtotal : base;
  const discounts = quote ? quote.discounts : 0;
  const durationLabel =
    sel.service?.billingUnit === "PER_HOUR"
      ? `${sel.durationMinutes / 60} hour${sel.durationMinutes / 60 === 1 ? "" : "s"}`
      : `${sel.durationMinutes} min`;

  const recurringLabel = useMemo(() => {
    if (!recurring) return "One-time";
    if (!recurringInterval) return "One-time";
    return recurring.intervals.find((i) => i.key === recurringInterval)?.label ?? "Recurring";
  }, [recurring, recurringInterval]);

  const dateLabelLong = useMemo(() => {
    if (!sel.date) return "";
    return formatYmdInTimeZone(sel.date, business.timezone, { weekday: "long", month: "long", day: "numeric" });
  }, [sel.date, business.timezone]);

  const dateLabelShort = useMemo(() => {
    if (!sel.date) return "";
    return formatYmdInTimeZone(sel.date, business.timezone, { weekday: "short", month: "short", day: "numeric" });
  }, [sel.date, business.timezone]);

  const dateLabelCompact = useMemo(() => {
    if (!sel.date) return "";
    return formatYmdInTimeZone(sel.date, business.timezone, { month: "numeric", day: "numeric", year: "numeric" });
  }, [sel.date, business.timezone]);

  const confirmedStart = sel.slot?.startUTC ?? confirmed?.startTime ?? "";
  const confirmedEnd = sel.slot?.endUTC ?? confirmed?.endTime ?? "";
  const confirmedServiceName = sel.service?.name ?? confirmed?.serviceName ?? "";
  const confirmedEmail = sel.email || confirmed?.customerEmail || "";

  const confirmedDateLabelLong = useMemo(() => {
    if (sel.date) return dateLabelLong;
    if (!confirmedStart) return "";
    const dt = new Date(confirmedStart);
    if (Number.isNaN(dt.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: business.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(dt);
  }, [sel.date, dateLabelLong, confirmedStart, business.timezone]);

  const confirmedTimeLabel = useMemo(() => {
    if (sel.slot) return formatTimeDisplay(sel.slot.startTime);
    if (!confirmedStart) return "";
    const dt = new Date(confirmedStart);
    if (Number.isNaN(dt.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: business.timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(dt);
  }, [sel.slot, confirmedStart, business.timezone]);

  const slotGroups = useMemo(() => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map((n) => Number(n));
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };
    const morning: SlotData[] = [];
    const afternoon: SlotData[] = [];
    const evening: SlotData[] = [];
    // Staff is auto-assigned, so collapse duplicate times coming from different
    // team members and show each start time once (keeping the first available).
    const seenStart = new Set<string>();
    for (const s of slots) {
      if (seenStart.has(s.startUTC)) continue;
      seenStart.add(s.startUTC);
      const mins = toMinutes(s.startTime);
      if (mins < 12 * 60) morning.push(s);
      else if (mins < 17 * 60) afternoon.push(s);
      else evening.push(s);
    }
    return { morning, afternoon, evening };
  }, [slots]);

  const ctaLabel =
    step === 1
      ? "Find Availability"
      : step === 4
        ? loading
          ? "Confirming…"
          : "Confirm Booking"
        : "Continue";

  const ctaDisabled =
    step === 1
      ? !sel.service
      : step === 4
        ? loading || !sel.name || !sel.email || !sel.service || !sel.slot
        : true;

  const onCta = () => {
    if (step === 1) {
      if (!sel.service) {
        setError("Please select a service first");
        return;
      }
      setError("");
      setStep(3);
      return;
    }
    if (step === 4) {
      void submit();
    }
  };

  useEffect(() => {
    if (!embed) return;
    if (step !== 6) return;
    if (!bookingId) return;
    window.parent.postMessage(
      { type: "db:booking-complete", bookingId, businessSlug: business.slug },
      "*"
    );
    if (lastPaymentSessionId) {
      window.parent.postMessage(
        { type: "db:payment-complete", bookingId, businessSlug: business.slug, sessionId: lastPaymentSessionId },
        "*"
      );
    }
    if (bookingStatus === "CONFIRMED") {
      window.parent.postMessage(
        { type: "db:appointment-confirmed", bookingId, businessSlug: business.slug, status: bookingStatus },
        "*"
      );
    }
  }, [embed, step, bookingId, business.slug, lastPaymentSessionId, bookingStatus]);

  const downloadIcs = () => {
    const startUtc = sel.slot?.startUTC ?? confirmed?.startTime;
    const endUtc = sel.slot?.endUTC ?? confirmed?.endTime;
    const serviceName = sel.service?.name ?? confirmed?.serviceName;
    if (!startUtc || !endUtc || !serviceName) return;
    const uid = `${bookingId || "booking"}@${business.slug}`;
    const ics = makeIcs({
      uid,
      summary: `${business.name} — ${serviceName}`,
      description: `Booking confirmation for ${business.name}`,
      startUtc,
      endUtc,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${business.slug}-booking.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={embed ? "bg-transparent" : "min-h-screen bg-gray-50"} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Business header ─────────────────────────────────────────────── */}
      <div className="relative" style={embed ? {} : { background: primary }}>
        {business.coverImageUrl && (
          <div className="absolute inset-0 opacity-20">
            <Image src={business.coverImageUrl} alt="" fill className="object-cover" />
          </div>
        )}
        {!embed ? (
          <div className="relative max-w-lg mx-auto px-6 py-8 text-center">
            {business.logoUrl ? (
              // User-supplied logo can be any domain — plain <img> avoids next/image host allowlisting.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 ring-4 ring-white/20 bg-white"
              />
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
        ) : (
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6 text-center">
            {business.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-14 w-14 rounded-2xl object-cover mx-auto mb-3 ring-1 ring-gray-100 bg-white"
              />
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-[#0b5c8b]">Book your appointment</h1>
            <p className="text-sm text-gray-500 mt-1">{business.name}</p>
            {business.welcomeMessage && (
              <p className="text-sm text-gray-500 mt-1">{business.welcomeMessage}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Step indicator ──────────────────────────────────────────────── */}
      {!embed && step < 5 && (
        <div className="max-w-lg mx-auto px-6">
          <div className="flex items-center justify-center gap-2 py-5">
            {(["Pricing","Date & Time","Details"] as const).map((label, i) => {
              const current = step === 1 ? 1 : step === 3 ? 2 : 3;
              const n = i + 1;
              const done = current > n;
              const active = current === n;
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done ? "text-white" : active ? "text-white" : "bg-white border-2 border-gray-200 text-gray-400"
                      }`}
                      style={done || active ? { background: primary } : {}}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : n}
                    </div>
                    <span className={`text-[10px] font-semibold hidden sm:block ${active ? "text-gray-700" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && <div className={`w-6 h-0.5 rounded-full mb-4 ${done ? "" : "bg-gray-200"}`} style={done ? { background: primary } : {}} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className={embed ? "max-w-6xl mx-auto px-4 sm:px-6 pb-10" : "max-w-lg lg:max-w-6xl mx-auto px-6 lg:px-8 pb-12"}>
        <div className={embed ? "grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start" : "lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start"}>
          <div className="min-w-0">

        {/* STEP 1 — Get pricing */}
        {step === 1 && (
          <div className={embed ? "space-y-5" : "space-y-4"}>
            <div className={embed ? "bg-[#0b5c8b]/5 rounded-2xl p-5 border border-gray-100" : ""}>
              <h2 className="text-xl font-black text-[#0b5c8b]">Get Pricing &amp; Book In 60 Seconds</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pick your service and options to see live pricing, then find the best day and time.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-[#0b5c8b]">Where will the service be taking place?</div>
                  <HelpTooltip
                    ariaLabel="Help: Zip code"
                    content={
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-[#0b5c8b]">Zip code</div>
                        <div className="text-sm text-gray-600">Used for local pricing rules and service-area checks (if enabled).</div>
                      </div>
                    }
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Enter Zip Code For Pricing</div>
                  <input
                    className={inp}
                    inputMode="numeric"
                    placeholder="Zip Code"
                    value={String(intake.zipCode ?? "")}
                    onChange={(e) => setIntake((p) => ({ ...p, zipCode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-[#0b5c8b]">Select your desired type of service</div>
                  <HelpTooltip
                    ariaLabel="Help: Service selection"
                    content={
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-[#0b5c8b]">Service selection</div>
                        <div className="text-sm text-gray-600">Choose what you want to book. Pricing and availability update automatically.</div>
                      </div>
                    }
                  />
                </div>
                <select
                  className={inp + " bg-white"}
                  value={sel.service?.id ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const s = services.find((x) => x.id === id) ?? null;
                    if (!s) {
                      setSel((p) => ({ ...p, service: null, staff: null, date: "", slot: null }));
                      return;
                    }
                    const defaultDuration =
                      s.billingUnit === "PER_HOUR" ? (s.minDurationMinutes ?? s.duration) : s.duration;
                    setSel((p) => ({
                      ...p,
                      service: s,
                      staff: null,
                      durationMinutes: defaultDuration,
                      date: "",
                      slot: null,
                    }));
                    setAddOnKeys([]);
                    setIsCommercial(false);
                    setRecurringInterval("");
                    setPromoCode("");
                    setQuote(null);
                  }}
                >
                  <option value="">Select a service…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.price > 0 ? ` — ${formatCurrency(s.price, s.currency)}${s.billingUnit === "PER_HOUR" ? "/hr" : ""}` : ""}
                    </option>
                  ))}
                </select>
                {!!sel.service?.staff?.length && (
                  <div className="text-xs text-gray-500">
                    A team member will be assigned automatically based on availability.
                  </div>
                )}
              </div>

              {recurring && recurring.intervals.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-[#0b5c8b]">Frequency</div>
                    <HelpTooltip
                      ariaLabel="Help: Frequency"
                      content={
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-[#0b5c8b]">Frequency</div>
                          <div className="text-sm text-gray-600">Recurring bookings can qualify for discounts.</div>
                        </div>
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setRecurringInterval("")}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        !recurringInterval ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                      }`}
                      style={!recurringInterval ? { background: primary } : {}}
                    >
                      One-time
                    </button>
                    {recurring.intervals.map((i) => (
                      <button
                        key={i.key}
                        type="button"
                        onClick={() => setRecurringInterval(i.key)}
                        className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          recurringInterval === i.key ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                        }`}
                        style={recurringInterval === i.key ? { background: primary } : {}}
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(customerTypes || intakeFields.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-[#0b5c8b]">What needs to be done?</div>
                    <HelpTooltip
                      ariaLabel="Help: Booking questions"
                      content={
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-[#0b5c8b]">Booking questions</div>
                          <div className="text-sm text-gray-600">These questions help estimate pricing and duration before you choose a time.</div>
                        </div>
                      }
                    />
                  </div>

                  {showCustomerTypeToggle && (
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
                  )}

                  <div className={embed ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                    {intakeFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {field.label}{field.required ? " *" : ""}
                          </label>
                          <HelpTooltip
                            ariaLabel={`Help: ${field.label}`}
                            content={
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-[#0b5c8b]">{field.label}</div>
                                <div className="text-sm text-gray-600">Answer based on your job so pricing can update accurately.</div>
                              </div>
                            }
                          />
                        </div>
                        {field.type === "text" && (
                          <input
                            className={inp}
                            value={String(intake[field.key] ?? "")}
                            placeholder={field.placeholder ?? ""}
                            onChange={(e) => setIntake((p) => ({ ...p, [field.key]: e.target.value }))}
                          />
                        )}
                        {field.type === "number" && (
                          <input
                            className={inp}
                            type="number"
                            min={0}
                            value={String(intake[field.key] ?? "")}
                            placeholder={field.placeholder ?? ""}
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
                            className={inp + " bg-white"}
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
                  </div>
                </div>
              )}

              {addOns.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-[#0b5c8b]">Select extras</div>
                    <HelpTooltip
                      ariaLabel="Help: Extras"
                      content={
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-[#0b5c8b]">Extras</div>
                          <div className="text-sm text-gray-600">Add-ons are optional items you can include with your booking.</div>
                        </div>
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            checked ? "border-transparent text-white" : "border-gray-200 bg-white hover:border-gray-400"
                          }`}
                          style={checked ? { background: primary } : {}}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                checked ? "bg-white/15" : "bg-gray-50 border border-gray-100"
                              }`}
                              style={!checked && showIcons ? { color: accent } : {}}
                            >
                              {renderAddOnIcon(a.iconId)}
                            </div>
                            <div className="text-xs font-bold">{a.name}</div>
                          </div>
                          <div className={`text-xs mt-1 ${checked ? "text-white/90" : "text-gray-500"}`}>
                            +{formatCurrency(a.price, quote?.currency ?? business.currency)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email address</label>
                  <HelpTooltip
                    ariaLabel="Help: Email"
                    content={
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-[#0b5c8b]">Email</div>
                        <div className="text-sm text-gray-600">We’ll send your booking confirmation here.</div>
                      </div>
                    }
                  />
                </div>
                <input
                  className={inp}
                  type="email"
                  placeholder="Ex: example@you.com"
                  value={sel.email}
                  onChange={(e) => setSel((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              {/* Mobile CTA — only on the standalone booking page. In embed mode
                  the sticky summary panel (with its own CTA) is always visible,
                  so this would be a duplicate. */}
              {!embed && (
                <button
                  type="button"
                  onClick={() => {
                    if (!sel.service) {
                      setError("Please select a service first");
                      return;
                    }
                    setError("");
                    setStep(3);
                  }}
                  className="w-full py-3.5 font-bold text-white rounded-2xl transition-all flex items-center justify-center gap-2 lg:hidden"
                  style={{ background: primary }}
                >
                  Find Availability <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 — Pick date & time */}
        {step === 3 && sel.service && (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-lg font-bold text-gray-800">Pick a date & time</h2>

            {sel.service.billingUnit === "PER_HOUR" && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Duration</p>
                    <p className="text-xs text-gray-500">Choose how many hours you want to book.</p>
                  </div>
                  <select
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none"
                    value={sel.durationMinutes}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setSel((p) => ({ ...p, durationMinutes: next, slot: null }));
                    }}
                  >
                    {(() => {
                      const minDuration = sel.service ? (sel.service.minDurationMinutes ?? sel.service.duration) : 60;
                      return Array.from({ length: 8 }, (_, i) => i + 1)
                        .map((h) => h * 60)
                        .filter((m) => m >= minDuration)
                        .map((m) => (
                          <option key={m} value={m}>
                            {m / 60} hour{m / 60 === 1 ? "" : "s"}
                          </option>
                        ));
                    })()}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="md:pt-1">
                <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {dateLabelLong}
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
                  <div className="space-y-4">
                    {(
                      [
                        { label: "Morning", slots: slotGroups.morning },
                        { label: "Afternoon", slots: slotGroups.afternoon },
                        { label: "Evening", slots: slotGroups.evening },
                      ] as Array<{ label: string; slots: SlotData[] }>
                    )
                      .filter((g) => g.slots.length > 0)
                      .map((g) => (
                      <div key={g.label}>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{g.label}</div>
                        <div className="grid grid-cols-3 gap-2">
                          {g.slots.map((slot) => (
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
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
                ["Date",        dateLabelShort],
                ["Time",        formatTimeDisplay(sel.slot.startTime)],
                ["Duration",    durationLabel],
                ["Frequency", recurringLabel],
                ...(sel.service.price > 0 ? [["Total", formatCurrency(total, currency)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            {!!quote?.breakdown?.length && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-[#0b5c8b]">Pricing breakdown</div>
                  {quoteLoading && <div className="text-xs text-gray-400">Updating…</div>}
                </div>
                <div className="space-y-1">
                  {quote.breakdown.map((line) => (
                    <div key={line.label} className="flex justify-between text-xs text-gray-500">
                      <span className="truncate pr-2">{line.label}</span>
                      <span className={line.amount < 0 ? "text-emerald-600 font-semibold" : "text-gray-700"}>
                        {formatCurrency(line.amount, currency)}
                      </span>
                    </div>
                  ))}
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
                className="w-full py-3.5 font-bold text-white rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 lg:hidden"
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

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Payment</h2>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              <div className="text-sm font-semibold text-gray-800">Your booking is reserved</div>
              <div className="text-sm text-gray-500">Complete payment to confirm your appointment.</div>
              {!!bookingId && (
                <div className="text-xs text-gray-400">Reference #{bookingId.slice(0, 8).toUpperCase()}</div>
              )}
            </div>

            <button
              onClick={() => {
                if (!checkoutUrl) return;
                window.location.assign(checkoutUrl);
              }}
              disabled={!checkoutUrl || loading}
              className="w-full py-3.5 font-bold text-white rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: primary }}
            >
              {loading ? "Preparing…" : "Pay now"}
            </button>

            {!checkoutUrl && bookingId && (
              <button
                onClick={async () => {
                  setError("");
                  setLoading(true);
                  try {
                    const res = await fetch("/api/public/payment/retry", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ bookingId, embed }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(json?.error ?? "Failed to generate payment link");
                    const url = typeof json?.data?.checkoutUrl === "string" ? json.data.checkoutUrl : null;
                    setCheckoutUrl(url);
                    if (!url) throw new Error("Missing checkout URL");
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : "Failed to generate payment link");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-3.5 font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              >
                {loading ? "Generating…" : "Generate payment link"}
              </button>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: `${primary}18` }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: primary }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">You&apos;re all booked!</h2>
            <p className="text-gray-500 mb-6">
              A confirmation has been sent to <strong>{confirmedEmail}</strong>
            </p>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left mb-6 space-y-2">
              {[
                ["Service",  confirmedServiceName || "—"],
                ["Date",     confirmedDateLabelLong || "—"],
                ["Time",     confirmedTimeLabel || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={downloadIcs}
                disabled={!confirmedStart || !confirmedEnd || !confirmedServiceName}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-gray-300"
              >
                <FileText className="w-4 h-4" />
                Add to Calendar
              </button>
              {bookingId ? (
                <div className="text-xs text-gray-400">Confirmation #{bookingId.slice(0, 8).toUpperCase()}</div>
              ) : null}
            </div>

            <button
              onClick={() => {
                setSel({ service: null, staff: null, date: "", slot: null, durationMinutes: 60, name: "", email: "", phone: "", notes: "" });
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

          {step < 6 && (
            <div className={embed ? "sticky top-6" : "hidden lg:block sticky top-6"}>
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-[#0b5c8b]">Booking Summary</div>
                      <HelpTooltip
                        ariaLabel="Help: Booking summary"
                        content={
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-[#0b5c8b]">Booking summary</div>
                            <div className="text-sm text-gray-600">Updates live as you select services, extras, and frequency.</div>
                          </div>
                        }
                      />
                    </div>
                    {quoteLoading && <div className="text-xs text-gray-400">Updating…</div>}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Service</span>
                      <span className="font-semibold text-gray-800">{sel.service?.name ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Frequency</span>
                      <span className="font-semibold text-gray-800">{recurringLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Extras</span>
                      <span className="font-semibold text-gray-800">{addOnKeys.length ? `${addOnKeys.length} selected` : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">ZIP</span>
                      <span className="font-semibold text-gray-800">{String(intake.zipCode ?? "—") || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date</span>
                      <span className="font-semibold text-gray-800">{sel.date ? dateLabelCompact : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time</span>
                      <span className="font-semibold text-gray-800">{sel.slot ? formatTimeDisplay(sel.slot.startTime) : "—"}</span>
                    </div>
                  </div>

                  {showLivePricing && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-semibold text-gray-800">{formatCurrency(subtotal, currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Discounts</span>
                        <span className={discounts > 0 ? "font-semibold text-emerald-600" : "font-semibold text-gray-800"}>
                          {discounts > 0 ? `-${formatCurrency(discounts, currency)}` : formatCurrency(0, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-black">
                        <span className="text-gray-700">TOTAL</span>
                        <span style={{ color: primary }}>{formatCurrency(total, currency)}</span>
                      </div>
                    </div>
                  )}

                  {(step === 1 || step === 4) && (
                    <button
                      type="button"
                      onClick={onCta}
                      disabled={ctaDisabled}
                      className="w-full py-3 font-bold text-white rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: primary }}
                    >
                      {ctaLabel} {step === 1 ? <ChevronRight className="w-4 h-4" /> : null}
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-[#0b5c8b]">Live Reviews</div>
                    <button type="button" className="text-xs font-bold text-gray-400 hover:text-gray-600" aria-label="Reviews help">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3">
                    <div className="text-xs text-gray-600">
                      Great experience — on time, professional, and the place looked amazing after.
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs font-semibold text-gray-700">Amy G</div>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                  <div className="text-sm font-bold text-[#0b5c8b]">Popular Questions</div>
                  {[
                    "Are you insured and bonded?",
                    "How is pricing calculated?",
                    "When will I get a confirmation?",
                    "Can I reschedule my booking?",
                    "Why do you need my ZIP code?",
                  ].map((q) => (
                    <div key={q} className="flex items-start gap-2 text-xs text-gray-600">
                      <ChevronRight className="w-4 h-4 text-gray-300 mt-0.5" />
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
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
