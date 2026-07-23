import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveOwnerBusinessId } from "@/lib/owner-business";
import { portalBasePath, staffBasePath } from "@/lib/tenant-paths";

function safeRelativePath(value: string | undefined) {
  if (!value) return undefined;
  if (!value.startsWith("/")) return undefined;
  if (value.startsWith("//")) return undefined;
  return value;
}

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const params = await searchParams;
  const callbackUrl = safeRelativePath(params?.callbackUrl);

  const role = session.user.role;
  const staffHome = staffBasePath(session.user.businessSlug);
  const portalHome = portalBasePath(session.user.businessSlug);
  const ownerBusinessId =
    role === "OWNER" ? await resolveOwnerBusinessId(session.user.id, session.user.businessId) : null;
  const ownerOnboardingComplete = ownerBusinessId
    ? (
        await prisma.business.findUnique({
          where: { id: ownerBusinessId },
          select: { onboardingComplete: true },
        })
      )?.onboardingComplete ?? false
    : false;
  const home =
    role === "SUPER_ADMIN"
      ? "/superadmin"
      : role === "STAFF"
        ? staffHome
        : role === "CUSTOMER"
          ? portalHome
          : ownerOnboardingComplete
            ? "/dashboard"
            : "/onboarding";

  const allowedPrefix =
    role === "SUPER_ADMIN"
      ? "/superadmin"
      : role === "STAFF"
        ? staffHome
        : role === "CUSTOMER"
          ? portalHome
          : ownerOnboardingComplete
            ? "/dashboard"
            : "/onboarding";

  if (callbackUrl && callbackUrl.startsWith(allowedPrefix)) {
    redirect(callbackUrl);
  }

  redirect(home);
}
