import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { notFound } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Client Sign In" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function TenantPortalLoginPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!business) notFound();

  const callbackUrl = sp?.callbackUrl ?? `/b/${slug}/portal`;

  return (
    <AuthShell
      title={`${business.name} Client Portal`}
      subtitle="Sign in to view and manage your bookings."
      footer={
        <span>
          New client?{" "}
          <Link className="text-primary hover:underline" href={`/b/${slug}/portal/register`}>
            Create an account
          </Link>
        </span>
      }
    >
      <LoginForm callbackUrl={callbackUrl} businessSlug={slug} hideGoogle />
    </AuthShell>
  );
}
