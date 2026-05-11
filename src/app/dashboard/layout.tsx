// src/app/dashboard/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { MaintenanceBanner } from "@/components/dashboard/maintenance-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/superadmin");

  // Check maintenance mode
  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  const inMaintenance = settings?.maintenanceMode ?? false;

  // Load business for sidebar
  const business = session.user.businessId
    ? await prisma.business.findUnique({
        where: { id: session.user.businessId },
        select: { id: true, name: true, slug: true, logoUrl: true, onboardingComplete: true },
      })
    : null;

  // Redirect to onboarding if not complete
  if (!business?.onboardingComplete) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-primary/5 flex">
      {inMaintenance && <MaintenanceBanner />}
      <DashboardSidebar business={business} user={session.user} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader business={business} user={session.user} />
        <main className="flex-1 p-6 overflow-auto">
          {inMaintenance ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                <span className="text-2xl">🔧</span>
              </div>
              <h2 className="text-xl font-bold font-heading mb-2">Platform Maintenance</h2>
              <p className="text-muted-foreground max-w-sm">
                {settings?.maintenanceMessage ?? "Diamond Booking is undergoing maintenance. We'll be back shortly."}
              </p>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}
