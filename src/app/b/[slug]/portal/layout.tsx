import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalHeader } from "@/components/portal/portal-header";
import { portalBasePath } from "@/lib/tenant-paths";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function TenantPortalLayout({ children, params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/b/${slug}/portal/login`);

  const role = session.user.role;
  if (role === "SUPER_ADMIN") redirect("/superadmin");
  if (role !== "CUSTOMER") redirect("/dashboard");

  const businessSlug = session.user.businessSlug;
  if (!businessSlug) redirect("/portal/login");
  if (businessSlug !== slug) redirect(portalBasePath(businessSlug));

  const business = session.user.businessId
    ? await prisma.business.findUnique({
        where: { id: session.user.businessId },
        select: { id: true, name: true, logoUrl: true },
      })
    : null;

  const basePath = portalBasePath(slug);

  return (
    <div className="min-h-screen bg-primary/5 flex">
      <PortalSidebar business={business} user={session.user} basePath={basePath} />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

