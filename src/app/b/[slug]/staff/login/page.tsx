import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { notFound } from "next/navigation";

export const metadata = { title: "Staff Sign In" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function TenantStaffLoginPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!business) notFound();

  const callbackUrl = sp?.callbackUrl ?? `/b/${slug}/staff`;

  return (
    <AuthShell
      title={`${business.name} Staff Portal`}
      subtitle="Sign in to view your schedule and appointments."
    >
      <LoginForm callbackUrl={callbackUrl} businessSlug={slug} hideGoogle />
    </AuthShell>
  );
}

