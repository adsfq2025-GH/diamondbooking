// src/app/book/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingFlow } from "@/components/booking/booking-flow";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    embed?: string;
    preview?: string;
    // Live-preview design overrides (only honored when preview=1)
    pc?: string; // primary color
    ac?: string; // accent color
    logo?: string; // logo URL
    wm?: string; // welcome message
  }>;
};

function isFutureDate(value: Date | null | undefined) {
  return !value || value.getTime() > Date.now();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: { name: true, description: true },
  });
  if (!business) return { title: "Not Found" };
  return {
    title:       `Book with ${business.name}`,
    description: business.description ?? `Book an appointment with ${business.name}`,
  };
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const embed = sp?.embed === "1";
  const preview = sp?.preview === "1";

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    include: { businessHours: { orderBy: { dayOfWeek: "asc" } } },
  });

  if (!business) notFound();

  // Check maintenance
  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  if (settings?.maintenanceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔧</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">{business.name}</h1>
          <p className="text-gray-500">{settings.maintenanceMessage}</p>
        </div>
      </div>
    );
  }

  const services = await prisma.service.findMany({
    where: { businessId: business.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      staff: {
        where: { staff: { isActive: true } },
        include: { staff: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  const businessConfig = await prisma.businessConfig.findUnique({
    where: { businessId: business.id },
    select: { config: true },
  });

  // Check sub is active
  const owner = await prisma.user.findUnique({
    where: { id: business.ownerId },
    include: { subscription: { select: { status: true, trialEnd: true, isComped: true, compExpiresAt: true } } },
  });
  const subStatus = owner?.subscription?.status ?? null;
  const comped =
    !!owner?.subscription?.isComped &&
    isFutureDate(owner.subscription.compExpiresAt);
  const trialActive =
    subStatus === "TRIALING" && isFutureDate(owner?.subscription?.trialEnd);
  const subActive = comped || subStatus === "ACTIVE" || trialActive;
  const session = preview ? await auth() : null;
  const canPreviewInactiveWidget =
    preview &&
    !!session?.user &&
    (session.user.businessId === business.id || session.user.role === "SUPER_ADMIN");

  if (!subActive && !canPreviewInactiveWidget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">📅</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">{business.name}</h1>
          <p className="text-gray-500">Online booking is temporarily unavailable. Please contact the business directly.</p>
        </div>
      </div>
    );
  }

  // In preview mode, let the dashboard/onboarding pass unsaved design values via
  // query params so the live preview reflects edits before they're saved.
  const previewPrimary = preview && sp?.pc ? sp.pc : undefined;
  const previewAccent = preview && sp?.ac ? sp.ac : undefined;
  const previewLogo = preview && sp?.logo !== undefined ? sp.logo : undefined;
  const previewWelcome = preview && sp?.wm !== undefined ? sp.wm : undefined;

  const baseConfig = (businessConfig?.config ?? {}) as Record<string, unknown>;
  const effectiveConfig = previewAccent
    ? {
        ...baseConfig,
        theme: { ...((baseConfig.theme as Record<string, unknown>) ?? {}), accentColor: previewAccent },
      }
    : baseConfig;

  return (
    <BookingFlow
      business={{
        id:                  business.id,
        name:                business.name,
        slug:                business.slug,
        description:         business.description,
        logoUrl:             previewLogo !== undefined ? (previewLogo || null) : business.logoUrl,
        coverImageUrl:       business.coverImageUrl,
        primaryColor:        previewPrimary ?? business.primaryColor,
        welcomeMessage:      previewWelcome !== undefined ? (previewWelcome || null) : business.welcomeMessage,
        phone:               business.phone,
        email:               business.email,
        timezone:            business.timezone,
        currency:            business.currency,
        advanceBookingDays:  business.advanceBookingDays,
        minimumNoticeHours:  business.minimumNoticeHours,
        autoConfirm:         business.autoConfirm,
        cancellationPolicy:  business.cancellationPolicy,
        businessHours:       business.businessHours,
      }}
      config={effectiveConfig}
      services={services.map((s) => ({
        id:          s.id,
        name:        s.name,
        description: s.description,
        duration:    s.duration,
        price:       Number(s.price),
        billingUnit: s.billingUnit,
        minDurationMinutes: s.minDurationMinutes,
        currency:    s.currency,
        color:       s.color,
        staff:       s.staff.map((ss) => ss.staff),
      }))}
      embed={embed}
    />
  );
}
