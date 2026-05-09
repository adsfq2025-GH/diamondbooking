// src/types/index.ts
// Shared TypeScript types for Diamond Booking

import type {
  User,
  Business,
  Staff,
  Service,
  Booking,
  Customer,
  Subscription,
  PlanConfig,
  AuditLog,
  BookingStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  Role,
} from "@prisma/client";

// ─────────────────────────────────────────────
// RE-EXPORTS from Prisma
// ─────────────────────────────────────────────
export type {
  User,
  Business,
  Staff,
  Service,
  Booking,
  Customer,
  Subscription,
  PlanConfig,
  AuditLog,
  BookingStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  Role,
};

// ─────────────────────────────────────────────
// API RESPONSE WRAPPER
// ─────────────────────────────────────────────
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// ─────────────────────────────────────────────
// NEXTAUTH SESSION EXTENSION
// ─────────────────────────────────────────────
export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  businessId?: string;
  businessSlug?: string;
  isImpersonating?: boolean;
  originalAdminId?: string;
};

// ─────────────────────────────────────────────
// BUSINESS OWNER TYPES
// ─────────────────────────────────────────────
export type BusinessWithRelations = Business & {
  owner: Pick<User, "id" | "email" | "name" | "image">;
  _count?: {
    staff: number;
    services: number;
    bookings: number;
    customers: number;
  };
};

export type StaffWithServices = Staff & {
  services: {
    service: Service;
  }[];
};

export type ServiceWithStaff = Service & {
  staff: {
    staff: Staff;
  }[];
};

export type BookingWithRelations = Booking & {
  service: Service;
  staff: Pick<Staff, "id" | "name" | "avatarUrl">;
  customer: Customer;
};

export type CustomerWithBookings = Customer & {
  bookings: BookingWithRelations[];
  _count: { bookings: number };
  totalSpent: number;
};

// ─────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────
export type TimeSlot = {
  startTime: string;  // "HH:MM" local time
  endTime: string;
  staffId: string;
  staffName: string;
  available: boolean;
};

export type AvailabilityRequest = {
  businessSlug: string;
  serviceId: string;
  staffId: string | "any";
  date: string; // "YYYY-MM-DD"
};

// ─────────────────────────────────────────────
// BOOKING FLOW (Public page)
// ─────────────────────────────────────────────
export type BookingStep = 1 | 2 | 3 | 4 | 5;

export type BookingFormData = {
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
};

export type PublicBusiness = Pick<
  Business,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "logoUrl"
  | "coverImageUrl"
  | "primaryColor"
  | "welcomeMessage"
  | "phone"
  | "email"
  | "address"
  | "city"
  | "state"
  | "timezone"
  | "currency"
  | "advanceBookingDays"
  | "minimumNoticeHours"
  | "autoConfirm"
  | "cancellationPolicy"
> & {
  businessHours: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }[];
};

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────
export type DashboardStats = {
  bookingsToday: number;
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  revenueThisMonth: number;
  totalClients: number;
  upcomingBookings: BookingWithRelations[];
  recentActivity: ActivityItem[];
};

export type ActivityItem = {
  id: string;
  type: "booking_created" | "booking_cancelled" | "booking_completed" | "client_added";
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
};

// ─────────────────────────────────────────────
// SUPER ADMIN TYPES
// ─────────────────────────────────────────────
export type AdminBusinessRow = {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  totalBookings: number;
  totalRevenue: number;
  createdAt: Date;
  lastActiveAt: Date | null;
  isActive: boolean;
  city: string | null;
};

export type AdminStats = {
  totalBusinesses: number;
  newBusinessesThisMonth: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  totalBookings: number;
  bookingsThisMonth: number;
  totalCustomers: number;
  churnRate: number;
  arpu: number;
};

export type RevenueChartData = {
  month: string;
  mrr: number;
  newSubscriptions: number;
  churn: number;
};

export type PlanDistribution = {
  plan: SubscriptionPlan;
  count: number;
  percentage: number;
};

// ─────────────────────────────────────────────
// PLAN LIMITS
// ─────────────────────────────────────────────
export type PlanLimits = {
  maxStaff: number;        // -1 = unlimited
  maxServices: number;     // -1 = unlimited
  maxBookingsPerMonth: number; // -1 = unlimited
  removesBranding: boolean;
  emailReminders: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
};

// ─────────────────────────────────────────────
// FORM SCHEMAS (Zod inferred types)
// ─────────────────────────────────────────────
export type CreateServiceInput = {
  name: string;
  description?: string;
  duration: number;
  price: number;
  color?: string;
  staffIds: string[];
};

export type CreateStaffInput = {
  name: string;
  email?: string;
  phone?: string;
  serviceIds: string[];
};

export type CreateBookingInput = {
  serviceId: string;
  staffId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;
  startTime: string;
  notes?: string;
};

export type UpdateBusinessInput = {
  name?: string;
  slug?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  timezone?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  advanceBookingDays?: number;
  minimumNoticeHours?: number;
  bufferMinutes?: number;
  autoConfirm?: boolean;
  cancellationPolicy?: string;
};

// ─────────────────────────────────────────────
// STRIPE
// ─────────────────────────────────────────────
export type StripeCheckoutInput = {
  plan: SubscriptionPlan;
  interval: "monthly" | "yearly";
  successUrl?: string;
  cancelUrl?: string;
};

// ─────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};
