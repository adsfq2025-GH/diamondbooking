import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StaffSidebar } from "@/components/staff/staff-sidebar";
import { StaffHeader } from "@/components/staff/staff-header";
import { staffBasePath } from "@/lib/tenant-paths";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/staff/login");

  const role = session.user.role;
  if (role === "SUPER_ADMIN") redirect("/superadmin");
  if (role !== "STAFF") redirect("/dashboard");

  const business = session.user.businessId
    ? await prisma.business.findUnique({
        where: { id: session.user.businessId },
        select: { id: true, name: true, logoUrl: true },
      })
    : null;

  return (
    <div className="min-h-screen bg-primary/5 flex">
      <StaffSidebar business={business} user={session.user} basePath={staffBasePath(session.user.businessSlug)} />
      <div className="flex-1 flex flex-col min-w-0">
        <StaffHeader />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

