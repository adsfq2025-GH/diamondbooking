// src/app/onboarding/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard-v2";

export const metadata = { title: "Set Up Your Business — Diamond Booking" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/superadmin");

  // Already onboarded?
  if (session.user.businessId) {
    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { onboardingComplete: true },
    });
    if (business?.onboardingComplete) redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-6">
      <OnboardingWizard />
    </div>
  );
}
