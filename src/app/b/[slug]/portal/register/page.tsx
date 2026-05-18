import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/auth/auth-shell";
import { CustomerRegisterForm } from "@/components/portal/customer-register-form";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Client Sign Up" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TenantPortalRegisterPage({ params }: Props) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!business) notFound();

  return (
    <AuthShell
      title={`${business.name} Client Portal`}
      subtitle="Create your client account for this business."
      footer={
        <span>
          Already have an account?{" "}
          <Link className="text-primary hover:underline" href={`/b/${slug}/portal/login`}>
            Sign in
          </Link>
        </span>
      }
    >
      <CustomerRegisterForm businessSlug={slug} />
    </AuthShell>
  );
}

