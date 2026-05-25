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
  { value: "general_services", label: "General Services — General" },

  { value: "cleaning_service", label: "Cleaning Service — Home Services" },
  { value: "janitorial_service", label: "Janitorial Service — Home Services" },
  { value: "carpet_cleaning", label: "Carpet Cleaning — Home Services" },
  { value: "window_cleaning", label: "Window Cleaning — Home Services" },
  { value: "pressure_washing", label: "Pressure Washing — Home Services" },

  { value: "hvac", label: "HVAC — Home Services" },
  { value: "plumbing", label: "Plumbing — Home Services" },
  { value: "electrical", label: "Electrical — Home Services" },
  { value: "handyman", label: "Handyman — Home Services" },
  { value: "roofing", label: "Roofing — Home Services" },
  { value: "pest_control", label: "Pest Control — Home Services" },
  { value: "landscaping", label: "Landscaping — Home Services" },
  { value: "lawn_care", label: "Lawn Care — Home Services" },
  { value: "tree_service", label: "Tree Service — Home Services" },
  { value: "pool_service", label: "Pool Service — Home Services" },
  { value: "painting", label: "Painting — Home Services" },
  { value: "flooring", label: "Flooring — Home Services" },
  { value: "appliance_repair", label: "Appliance Repair — Home Services" },
  { value: "moving", label: "Moving — Home Services" },
  { value: "locksmith", label: "Locksmith — Home Services" },
  { value: "garage_door", label: "Garage Door — Home Services" },

  { value: "salon", label: "Hair Salon — Beauty" },
  { value: "barbershop", label: "Barbershop — Beauty" },
  { value: "nail_salon", label: "Nail Salon — Beauty" },
  { value: "esthetician", label: "Esthetician — Beauty" },
  { value: "med_spa", label: "Med Spa — Beauty" },
  { value: "spa", label: "Spa & Wellness — Beauty" },
  { value: "massage", label: "Massage Therapy — Wellness" },

  { value: "fitness", label: "Fitness & Personal Training — Wellness" },
  { value: "yoga", label: "Yoga & Pilates — Wellness" },

  { value: "chiropractic", label: "Chiropractic — Medical & Health" },
  { value: "physical_therapy", label: "Physical Therapy — Medical & Health" },
  { value: "therapy_counseling", label: "Therapy & Counseling — Medical & Health" },
  { value: "dental", label: "Dental Clinic — Medical & Health" },
  { value: "medical_clinic", label: "Medical Clinic — Medical & Health" },
  { value: "ultrasound", label: "Ultrasound Clinic — Medical & Health" },
  { value: "veterinary", label: "Veterinary — Medical & Health" },

  { value: "automotive", label: "Automotive Services — Automotive" },
  { value: "detailing", label: "Auto Detailing — Automotive" },

  { value: "photography", label: "Photography — Creative" },
  { value: "tattoo", label: "Tattoo & Piercing — Creative" },

  { value: "tutoring", label: "Tutoring & Education — Education" },
  { value: "music_lessons", label: "Music Lessons — Education" },

  { value: "consulting", label: "Consulting & Coaching — Professional Services" },
  { value: "accounting", label: "Accounting — Professional Services" },
  { value: "legal", label: "Legal Services — Professional Services" },
  { value: "real_estate", label: "Real Estate — Professional Services" },

  { value: "restaurant", label: "Restaurant / Hospitality — Hospitality" },
  { value: "event_services", label: "Event Services — Hospitality" },

  { value: "jewelry_store", label: "Jewelry Store — Retail & Luxury" },

  { value: "other", label: "Other" },
];

export const INDUSTRY_DEFAULT_SERVICE_DURATION_MINUTES: Record<string, number> = {
  general_services: 60,

  cleaning_service: 180,
  janitorial_service: 180,
  carpet_cleaning: 120,
  window_cleaning: 120,
  pressure_washing: 120,

  hvac: 90,
  plumbing: 90,
  electrical: 90,
  handyman: 120,
  roofing: 120,
  pest_control: 60,
  landscaping: 120,
  lawn_care: 60,
  tree_service: 180,
  pool_service: 60,
  painting: 180,
  flooring: 180,
  appliance_repair: 60,
  moving: 180,
  locksmith: 45,
  garage_door: 60,

  salon: 60,
  barbershop: 45,
  nail_salon: 60,
  esthetician: 60,
  med_spa: 60,
  spa: 60,
  massage: 60,

  fitness: 60,
  yoga: 60,

  chiropractic: 30,
  physical_therapy: 60,
  therapy_counseling: 60,
  dental: 60,
  medical_clinic: 30,
  ultrasound: 45,
  veterinary: 30,

  automotive: 60,
  detailing: 120,

  photography: 60,
  tattoo: 120,

  tutoring: 60,
  music_lessons: 60,

  consulting: 60,
  accounting: 60,
  legal: 60,
  real_estate: 60,

  restaurant: 60,
  event_services: 120,

  jewelry_store: 60,

  other: 60,
};

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
export function debounce<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  delay: number
): (...args: Args) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
