// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

// ─── Tailwind class merge ───────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency formatting ────────────────────
export function formatCurrency(
  amount: number | string,
  currency = "USD",
  locale = "en-US"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// ─── Date formatting ────────────────────────
export function formatDate(date: Date | string, fmt = "MMM d, yyyy"): string {
  return format(new Date(date), fmt);
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), "h:mm a");
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatInTz(
  date: Date | string,
  timezone: string,
  fmt = "h:mm a"
): string {
  return formatInTimeZone(new Date(date), timezone, fmt);
}

// ─── Slug generation ────────────────────────
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Number formatting ──────────────────────
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ─── MRR / ARR calculation ─────────────────
export function calculateMRR(
  subscriptions: Array<{ plan: string; status: string }>
): number {
  const prices: Record<string, number> = {
    FREE: 0,
    STARTER: 29,
    PROFESSIONAL: 59,
    ENTERPRISE: 119,
  };
  return subscriptions
    .filter((s) => s.status === "ACTIVE" || s.status === "TRIALING")
    .reduce((sum, s) => sum + (prices[s.plan] ?? 0), 0);
}

// ─── Time slots ─────────────────────────────
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// ─── Status helpers ─────────────────────────
export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "badge-warning",
    CONFIRMED: "badge-info",
    COMPLETED: "badge-success",
    CANCELLED: "badge-danger",
    NO_SHOW: "badge-neutral",
  };
  return colors[status] ?? "badge-neutral";
}

export function getSubscriptionStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "badge-success",
    TRIALING: "badge-info",
    PAST_DUE: "badge-danger",
    CANCELLED: "badge-neutral",
    INCOMPLETE: "badge-warning",
    PAUSED: "badge-warning",
    UNPAID: "badge-danger",
  };
  return colors[status] ?? "badge-neutral";
}

export function getPlanBadgeClass(plan: string): string {
  const classes: Record<string, string> = {
    FREE: "badge-free",
    STARTER: "badge-starter",
    PROFESSIONAL: "badge-professional",
    ENTERPRISE: "badge-enterprise",
  };
  return classes[plan] ?? "badge-neutral";
}

// ─── Validation helpers ─────────────────────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

// ─── Truncate text ──────────────────────────
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

// ─── Get initials ───────────────────────────
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Days of week ───────────────────────────
export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

// ─── Service duration options ────────────────
export const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 150, label: "2.5 hours" },
  { value: 180, label: "3 hours" },
];

// ─── Industry options ────────────────────────
export const INDUSTRY_OPTIONS = [
  { value: "salon", label: "Hair Salon" },
  { value: "barbershop", label: "Barbershop" },
  { value: "spa", label: "Spa & Wellness" },
  { value: "nail_salon", label: "Nail Salon" },
  { value: "massage", label: "Massage Therapy" },
  { value: "fitness", label: "Fitness & Personal Training" },
  { value: "yoga", label: "Yoga & Pilates" },
  { value: "clinic", label: "Medical / Dental Clinic" },
  { value: "tattoo", label: "Tattoo & Piercing" },
  { value: "consulting", label: "Consulting & Coaching" },
  { value: "restaurant", label: "Restaurant / Hospitality" },
  { value: "automotive", label: "Automotive Services" },
  { value: "cleaning", label: "Cleaning Services" },
  { value: "photography", label: "Photography" },
  { value: "tutoring", label: "Tutoring & Education" },
  { value: "veterinary", label: "Veterinary" },
  { value: "other", label: "Other" },
];

// ─── Timezone options ────────────────────────
export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Toronto", label: "Eastern Time - Toronto" },
  { value: "America/Vancouver", label: "Pacific Time - Vancouver" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Europe/Berlin", label: "Central European Time - Berlin" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

// ─── Error handling ─────────────────────────
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

// ─── Debounce ───────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
