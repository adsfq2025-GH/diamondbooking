// src/app/book/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingFlow } from "@/components/booking/booking-flow";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ embed?: string }> };

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
    include: { subscription: { select: { status: true } } },
  });
  const subActive = ["ACTIVE", "TRIALING"].includes(owner?.subscription?.status ?? "");

  if (!subActive) {
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

  return (
    <BookingFlow
      business={{
        id:                  business.id,
        name:                business.name,
        slug:                business.slug,
        description:         business.description,
        logoUrl:             business.logoUrl,
        coverImageUrl:       business.coverImageUrl,
        primaryColor:        business.primaryColor,
        welcomeMessage:      business.welcomeMessage,
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
      config={businessConfig?.config ?? {}}
      services={services.map((s) => ({
        id:          s.id,
        name:        s.name,
        description: s.description,
        duration:    s.duration,
        price:       Number(s.price),
        currency:    s.currency,
        color:       s.color,
        staff:       s.staff.map((ss) => ss.staff),
      }))}
      embed={embed}
    />
  );
}
