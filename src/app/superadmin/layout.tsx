// src/app/superadmin/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/superadmin/admin-sidebar";
import { AdminHeader } from "@/components/superadmin/admin-header";

export const metadata = { title: { template: "%s | Super Admin — Diamond Booking" } };

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="dark min-h-screen bg-background flex">
      <AdminSidebar user={session.user} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader user={session.user} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
